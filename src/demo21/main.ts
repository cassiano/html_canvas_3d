import { FPS, FPS_LOGGING_FRAME_PERIOD } from '../constants.ts'
import {
  createFrameLoop,
  fps,
  frameCount,
  millis,
  timesForEachN,
} from '../utils.ts'
import {
  background,
  render3dScene,
  render3dAxes,
  resetTransformationMatrix,
  text2d,
} from '../primitives.ts'
import { $v } from '../vector_3d.ts'
import { PI } from '../math_utils.ts'
import { autoRotationEnabled, rotateY, rotateX } from '../primitives.ts'
import { AstronomicalBody } from './astronomical_body.ts'
import { assertIsNotUndefined } from '../utils.ts'

// -------------------------------------------------------------------------------------------------

export const G = 6.6743e-11 // Universal gravitational constant, in m³ / (kg x s²).
export const AU = 149597870.7 // Astronomical Unit (in km).
export const EARTH_YEAR_IN_DAYS = 365.256363004 // Sidereal year.
export const EARTH_DAY_IN_SECONDS = 24 * 3600
export const EARTH_YEAR_IN_SECONDS = EARTH_YEAR_IN_DAYS * EARTH_DAY_IN_SECONDS
export const EARTH_MOON_DISTANCE_IN_KM = 384399 // Mean Earth-Moon distance in km.
export const MOON_RADIUS_IN_KM = 1737.4 // Mean Moon radius in km.
export const MOON_ORBITAL_PERIOD_IN_DAYS = 27.321582 // Sidereal orbital period of the Moon in days.
export const EARTH_RADIUS_IN_KM = 6371 // Mean Earth radius in km.
export const EARTH_ORBIT_DURATION_IN_SECONDS = 30
export const EARTH_MOON_CENTERS_DISTANCE_IN_M =
  (EARTH_RADIUS_IN_KM + EARTH_MOON_DISTANCE_IN_KM + MOON_RADIUS_IN_KM) * 1000 // The distance from the Earth's center to the Moon's center in m.

export const DEFAULT_RADIUS_SCALE = 1 / 5e5
export const DEFAULT_DISTANCE_SCALE = 3e-1 / AU // Scale down distances to fit the canvas.
export const EARTH_MOON_DISTANCE_SCALE = 30 // Scale up the Earth-Moon distance so the moon orbits around the Earth in a visually appealing way.

// Simulation seconds advanced per real second so Earth completes one orbit in the target duration.
export const SIMULATION_SECONDS_PER_REAL_SECOND =
  EARTH_YEAR_IN_SECONDS / EARTH_ORBIT_DURATION_IN_SECONDS

// -------------------------------------------------------------------------------------------------

type SolarSystemBodyType = {
  radius: number // Mean radius in km.
  radiusCustomScale?: number
  distanceFromSun: number // In AU.
  mass: number // In kg
  color: string
  orbitalPeriod: number // In (Earth) days, aka sidereal orbital period.
}

const SOLAR_SYSTEM_DATA: Record<string, SolarSystemBodyType> = {
  sun: {
    radius: 695700,
    radiusCustomScale: DEFAULT_RADIUS_SCALE / 15, // Scale down the sun's radius to fit the canvas.
    distanceFromSun: 0,
    mass: 1.9891e30,
    color: 'yellow',
    orbitalPeriod: 0,
  },
  mercury: {
    radius: 2439.4,
    distanceFromSun: 0.387098,
    mass: 0.330103e24,
    color: 'brown',
    orbitalPeriod: 87.9691,
  },
  venus: {
    radius: 6051.8,
    distanceFromSun: 0.723332,
    mass: 4.86731e24,
    color: 'white',
    orbitalPeriod: 224.701,
  },
  earth: {
    radius: EARTH_RADIUS_IN_KM,
    distanceFromSun: 1,
    mass: 5.97217e24,
    color: 'cyan',
    orbitalPeriod: EARTH_YEAR_IN_DAYS,
  },
  moon: {
    radius: MOON_RADIUS_IN_KM,
    distanceFromSun: 1,
    mass: 7.348e22,
    color: 'gray',
    orbitalPeriod: EARTH_YEAR_IN_DAYS, // Around the Sun (same as Earth).
  },
  mars: {
    radius: 3389.5,
    distanceFromSun: 1.523679,
    mass: 0.641691e24,
    color: 'red',
    orbitalPeriod: 686.98,
  },
  jupiter: {
    radius: 69911,
    distanceFromSun: 5.2044,
    mass: 1898.125e24,
    color: 'green',
    orbitalPeriod: 4332.59,
  },
  saturn: {
    radius: 58232,
    distanceFromSun: 9.5826,
    mass: 568.317e24,
    color: 'orange',
    orbitalPeriod: 10759.22,
  },
  uranus: {
    radius: 25362,
    distanceFromSun: 19.2184,
    mass: 86.8099e24,
    color: 'purple',
    orbitalPeriod: 30688.5,
  },
  neptune: {
    radius: 24622,
    distanceFromSun: 30.11,
    mass: 102.4092e24,
    color: 'blue',
    orbitalPeriod: 60182,
  },
}

// -------------------------------------------------------------------------------------------------

const bodies = Object.entries(SOLAR_SYSTEM_DATA).map(([name, data]) => {
  const {
    radius,
    distanceFromSun,
    mass,
    color,
    orbitalPeriod,
    radiusCustomScale,
  } = data

  return new AstronomicalBody(
    name,
    radius * 1000, // Convert radius from km to m.
    distanceFromSun * AU * 1000, // Convert from AU to m.
    mass,
    color,
    orbitalPeriod,
    radiusCustomScale,
  )
})

// const sun = bodies.find(body => body.name === 'sun')
// assertIsNotUndefined(sun)

export const earth = bodies.find(body => body.name === 'earth')
assertIsNotUndefined(earth)

let lastPhysicsMillis: number | null = null

const renderDebugHud = (
  dtRealSeconds: number,
  simulationDeltaSeconds: number,
) => {
  const dtMs = (dtRealSeconds * 1000).toFixed(2)
  const simDays = (simulationDeltaSeconds / EARTH_DAY_IN_SECONDS).toFixed(4)
  const currentFps = fps()?.toFixed(1)

  text2d(`dt: ${dtMs} ms`, $v(-420, 420), 'white')
  text2d(`Sim. dt: ${simDays} days`, $v(-420, 370), 'white')
  text2d(`FPS: ${currentFps}`, $v(-420, 320), 'white')
}

// -------------------------------------------------------------------------------------------------

const draw = () => {
  if (frameCount() % FPS_LOGGING_FRAME_PERIOD === 0) console.log({ fps: fps() })

  const nowMillis = millis()
  const dtRealSeconds =
    lastPhysicsMillis === null
      ? 1 / FPS
      : Math.max(0, (nowMillis - lastPhysicsMillis) / 1000)
  lastPhysicsMillis = nowMillis

  const simulationDeltaSeconds =
    dtRealSeconds * SIMULATION_SECONDS_PER_REAL_SECOND

  background('black')

  rotateX(PI / 20)

  if (autoRotationEnabled) rotateY(-millis() / 5000)
  else rotateY(PI / 6)

  render3dAxes()

  // renderDebugHud(dtRealSeconds, simulationDeltaSeconds)

  timesForEachN([bodies.length, bodies.length], (i, j) => {
    if (i !== j) bodies[i].attract(bodies[j])
  })

  bodies.forEach(body => {
    body.updateWithDelta(simulationDeltaSeconds)
    body.render()
  })
}

const onPaused = () => {
  text2d('PAUSED', $v(0, 300))
}

const { start, stop } = createFrameLoop(
  () => {
    resetTransformationMatrix()
    draw()
    render3dScene()
  },
  onPaused,
  FPS,
)

export { start, stop }
