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
import {
  autoRotationEnabled,
  rotateY,
  rotateX,
  scale,
  isolateTransformations,
  saturnRing,
} from '../primitives.ts'
import { AstronomicalBody } from './astronomical_body.ts'
import { assertIsNotUndefined } from '../utils.ts'
import { rotateZ } from '../primitives.ts'

// -------------------------------------------------------------------------------------------------

export const G = 6.6743e-11 // Universal gravitational constant, in m³ / (kg x s²).
export const AU = 149597870.7 // Astronomical Unit (in km).
export const KM_TO_M = 1000 // Conversion factor from km to m.
export const EARTH_YEAR_IN_DAYS = 365.256363004 // Sidereal year.
export const EARTH_DAY_IN_SECONDS = 24 * 3600
export const EARTH_YEAR_IN_SECONDS = EARTH_YEAR_IN_DAYS * EARTH_DAY_IN_SECONDS
export const EARTH_MOON_DISTANCE_IN_KM = 384399 // Mean Earth-Moon distance in km.
export const MOON_RADIUS_IN_KM = 1737.4 // Mean Moon radius in km.
export const MOON_ORBITAL_PERIOD_IN_DAYS = 27.321582 // Sidereal orbital period of the Moon in days.
export const MOON_ORBITAL_PERIOD_IN_SECONDS =
  MOON_ORBITAL_PERIOD_IN_DAYS * EARTH_DAY_IN_SECONDS
export const EARTH_RADIUS_IN_KM = 6371 // Mean Earth radius in km.
export const EARTH_ORBIT_DURATION_IN_SECONDS = 120
export const EARTH_MOON_CENTERS_DISTANCE_IN_M =
  (EARTH_RADIUS_IN_KM + EARTH_MOON_DISTANCE_IN_KM + MOON_RADIUS_IN_KM) * KM_TO_M // The distance from the Earth's center to the Moon's center in m.

export const DEFAULT_RADIUS_SCALE = 1 / 5e5
export const DEFAULT_DISTANCE_SCALE = 3e-1 / AU // Scale down distances to fit the canvas.
export const EARTH_MOON_DISTANCE_SCALE = 25 // Scale up the Earth-Moon distance arbitrarily, so the moon orbits around the Earth in a visually appealing way.

// Simulation seconds advanced per real second so Earth completes one orbit in the target duration.
export const SIMULATION_SECONDS_PER_REAL_SECOND =
  EARTH_YEAR_IN_SECONDS / EARTH_ORBIT_DURATION_IN_SECONDS

// -------------------------------------------------------------------------------------------------

const RINGS_DISTANCE_FROM_SATURN_SURFACE_IN_KM = 6632 // In km. The distance from Saturn's surface to the innermost ring (D ring).

const SATURN_RINGS_DATA: Record<string, { width: number; color: string }> = {
  // Width in km.
  a: { width: 14585, color: 'lightPink' },
  cassiniDivision: { width: 4800, color: 'black' },
  b: { width: 25554, color: 'magenta' },
  c: { width: 17357, color: 'lightGreen' },
  d: { width: 7594, color: 'purple' },
}

const drawSaturnRings = (radius: number) => {
  let startingRadius =
    (radius + RINGS_DISTANCE_FROM_SATURN_SURFACE_IN_KM * KM_TO_M) *
    DEFAULT_RADIUS_SCALE

  isolateTransformations(() => {
    rotateX(PI / 4)
    rotateZ(millis() / 1500)

    // D ring.
    saturnRing(
      startingRadius,
      startingRadius +
        SATURN_RINGS_DATA.d.width * KM_TO_M * DEFAULT_RADIUS_SCALE,
      {
        color: SATURN_RINGS_DATA.d.color,
        opacity: 0.5,
      },
    )

    startingRadius += SATURN_RINGS_DATA.d.width * KM_TO_M * DEFAULT_RADIUS_SCALE

    // C ring.
    saturnRing(
      startingRadius,
      startingRadius +
        SATURN_RINGS_DATA.c.width * KM_TO_M * DEFAULT_RADIUS_SCALE,
      {
        color: SATURN_RINGS_DATA.c.color,
        opacity: 0.5,
      },
    )

    startingRadius += SATURN_RINGS_DATA.c.width * KM_TO_M * DEFAULT_RADIUS_SCALE

    // B ring.
    saturnRing(
      startingRadius,
      startingRadius +
        SATURN_RINGS_DATA.b.width * KM_TO_M * DEFAULT_RADIUS_SCALE,
      {
        color: SATURN_RINGS_DATA.b.color,
        opacity: 0.5,
      },
    )

    startingRadius += SATURN_RINGS_DATA.b.width * KM_TO_M * DEFAULT_RADIUS_SCALE

    // Cassini Division.
    saturnRing(
      startingRadius,
      startingRadius +
        SATURN_RINGS_DATA.cassiniDivision.width *
          KM_TO_M *
          DEFAULT_RADIUS_SCALE,
      {
        color: SATURN_RINGS_DATA.cassiniDivision.color,
        opacity: 0.5,
      },
    )

    startingRadius +=
      SATURN_RINGS_DATA.cassiniDivision.width * KM_TO_M * DEFAULT_RADIUS_SCALE

    // A ring.
    saturnRing(
      startingRadius,
      startingRadius +
        SATURN_RINGS_DATA.a.width * KM_TO_M * DEFAULT_RADIUS_SCALE,
      {
        color: SATURN_RINGS_DATA.a.color,
        opacity: 0.5,
      },
    )
  })
}

// -------------------------------------------------------------------------------------------------

type SolarSystemBodyType = {
  radius: number // Mean radius in km.
  radiusCustomScale?: number
  distanceFromSun: number // In AU.
  mass: number // In kg
  color: string
  orbitalPeriod: number // Aka sidereal orbital period, in (Earth) days.
  renderRings?: (radius: number) => void
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
    color: 'tomato',
    orbitalPeriod: 87.9691,
  },
  venus: {
    radius: 6051.8,
    distanceFromSun: 0.723332,
    mass: 4.86731e24,
    color: 'gold',
    orbitalPeriod: 224.701,
  },
  earth: {
    radius: EARTH_RADIUS_IN_KM,
    distanceFromSun: 1,
    mass: 5.97217e24,
    color: 'dodgerBlue',
    orbitalPeriod: EARTH_YEAR_IN_DAYS,
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
    color: 'mediumSeaGreen',
    orbitalPeriod: 4332.59,
  },
  saturn: {
    radius: 58232,
    distanceFromSun: 9.5826,
    mass: 568.317e24,
    color: 'orange',
    orbitalPeriod: 10759.22,
    renderRings: drawSaturnRings,
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
    color: 'slateBlue',
    orbitalPeriod: 60182,
  },
  moon: {
    radius: MOON_RADIUS_IN_KM,
    distanceFromSun: 1,
    mass: 7.348e22,
    color: 'gray',
    orbitalPeriod: EARTH_YEAR_IN_DAYS, // Around the Sun (same as Earth).
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
    renderRings,
  } = data

  return new AstronomicalBody(
    name,
    radius * KM_TO_M, // Convert radius from km to m.
    distanceFromSun * AU * KM_TO_M, // Convert from AU to m.
    mass,
    color,
    orbitalPeriod * EARTH_DAY_IN_SECONDS, // Convert from days to seconds.
    radiusCustomScale,
    renderRings,
  )
})

export const earth = bodies.find(body => body.name === 'earth')
assertIsNotUndefined(earth)

let latestPhysicsMillis: number | null = null

// -------------------------------------------------------------------------------------------------

const draw = () => {
  if (frameCount() % FPS_LOGGING_FRAME_PERIOD === 0) console.log({ fps: fps() })

  const nowMillis = millis()
  const dtRealSeconds =
    latestPhysicsMillis === null
      ? 1 / FPS
      : (nowMillis - latestPhysicsMillis) / 1000
  latestPhysicsMillis = nowMillis

  const simulationDeltaSeconds =
    dtRealSeconds * SIMULATION_SECONDS_PER_REAL_SECOND

  background('black')

  scale(1.3)
  rotateX(PI / 20)

  if (autoRotationEnabled) rotateY(-millis() / 5000)
  else rotateY(PI / 6)

  render3dAxes()

  timesForEachN([bodies.length, bodies.length], (i, j) => {
    if (i !== j) bodies[i].attract(bodies[j])
  })

  bodies.forEach(body => {
    body.update(simulationDeltaSeconds)
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
