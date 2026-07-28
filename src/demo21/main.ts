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

// -------------------------------------------------------------------------------------------------

export const G = 6.6743e-11 // Universal gravitational constant, in m³ / (kg x s²).
export const AU = 149597870.7 // Astronomical Unit (in km).
export const EARTH_YEAR_IN_DAYS = 365.256363004 // Sidereal year.
export const EARTH_DAY_IN_SECONDS = 24 * 3600
export const EARTH_YEAR_IN_SECONDS = EARTH_YEAR_IN_DAYS * EARTH_DAY_IN_SECONDS
// const EARTH_MOON_DISTANCE = 384399 // Mean Earth-Moon distance in km.
export const EARTH_ORBIT_DURATION_SECONDS = 30

export const DEFAULT_RADIUS_SCALE = 1 / 5e5
export const DEFAULT_DISTANCE_SCALE = 3000 / AU / 1e4 // Scale down distances to fit the canvas.

// Simulation seconds advanced per real second so Earth completes one orbit in the target duration.
export const SIMULATION_SECONDS_PER_REAL_SECOND =
  EARTH_YEAR_IN_SECONDS / EARTH_ORBIT_DURATION_SECONDS

// Kept for debug/logging in "simulated days per real second".
export const ORBIT_SPEED_SCALE =
  SIMULATION_SECONDS_PER_REAL_SECOND / EARTH_DAY_IN_SECONDS

// -------------------------------------------------------------------------------------------------

type SolarSystemBodyType = {
  radius: number // Mean radius in km.
  radiusCustomScale?: number
  sunDistance: number // In AU.
  mass: number // In kg
  color: string
  orbitalPeriod: number // In (Earth) days, aka sidereal orbital period.
}

const SOLAR_SYSTEM_DATA: Record<string, SolarSystemBodyType> = {
  sun: {
    radius: 695700,
    radiusCustomScale: DEFAULT_RADIUS_SCALE / 20, // Scale down the sun's radius to fit the canvas.
    sunDistance: 0,
    mass: 1.9891e30,
    color: 'yellow',
    orbitalPeriod: 0,
  },
  mercury: {
    radius: 2439.4,
    radiusCustomScale: DEFAULT_RADIUS_SCALE,
    sunDistance: 0.387098,
    mass: 0.330103e24,
    color: 'brown',
    orbitalPeriod: 87.9691,
  },
  venus: {
    radius: 6051.8,
    radiusCustomScale: DEFAULT_RADIUS_SCALE,
    sunDistance: 0.723332,
    mass: 4.86731e24,
    color: 'gray',
    orbitalPeriod: 224.701,
  },
  earth: {
    radius: 6371,
    radiusCustomScale: DEFAULT_RADIUS_SCALE,
    sunDistance: 1,
    mass: 5.97217e24,
    color: 'cyan',
    orbitalPeriod: EARTH_YEAR_IN_DAYS,
  },
  // moon: {
  //   radius: 1737.4,
  //   sunDistance: 1 + EARTH_MOON_DISTANCE / AU,
  //   mass: 7.348e22,
  //   color: 'gray',
  //   orbitalPeriod: 27.321582,
  // },
  mars: {
    radius: 3389.5,
    radiusCustomScale: DEFAULT_RADIUS_SCALE,
    sunDistance: 1.523679,
    mass: 0.641691e24,
    color: 'red',
    orbitalPeriod: 686.98,
  },
  // jupiter: {
  //   radius: 69911,
  //   sunDistance: 5.2044,
  //   mass: 1898.125e24,
  //   color: 'gray',
  //   orbitalPeriod: 4332.59,
  // },
  // saturn: {
  //   radius: 58232,
  //   sunDistance: 9.5826,
  //   mass: 568.317e24,
  //   color: 'orange',
  //   orbitalPeriod: 10759.22,
  // },
  // uranus: {
  //   radius: 25362,
  //   sunDistance: 19.2184,
  //   mass: 86.8099e24,
  //   color: 'cyan',
  //   orbitalPeriod: 30688.5,
  // },
  // neptune: {
  //   radius: 24622,
  //   sunDistance: 30.11,
  //   mass: 102.4092e24,
  //   color: 'blue',
  //   orbitalPeriod: 60182,
  // },
}

// -------------------------------------------------------------------------------------------------

const bodies = Object.entries(SOLAR_SYSTEM_DATA).map(([name, data]) => {
  const {
    radius,
    sunDistance,
    mass,
    color,
    orbitalPeriod: siderealOrbitalPeriod,
    radiusCustomScale: radiusRatio,
  } = data

  return new AstronomicalBody(
    name,
    radius * 1000, // Convert radius from km to m.
    sunDistance * AU * 1000, // Convert sunDistance from AU to m.
    mass,
    color,
    siderealOrbitalPeriod,
    radiusRatio,
  )
})

// const sun = bodies.find(body => body.name === 'sun')
// const earth = bodies.find(body => body.name === 'earth')

// if (!sun) throw new Error('Sun not found in solar system data.')
// if (!earth) throw new Error('Earth not found in solar system data.')

// logJson({ ORBIT_SPEED_SCALE })

let lastPhysicsMillis: number | null = null

const _renderDebugHud = (
  dtRealSeconds: number,
  simulationDeltaSeconds: number,
) => {
  const dtMs = (dtRealSeconds * 1000).toFixed(2)
  const simDays = (simulationDeltaSeconds / EARTH_DAY_IN_SECONDS).toFixed(4)
  const currentFps = fps()?.toFixed(1)

  text2d(`dt: ${dtMs} ms`, $v(-420, 320))
  text2d(`sim dt: ${simDays} days`, $v(-420, 295))
  text2d(`fps: ${currentFps}`, $v(-420, 270))
}

// -------------------------------------------------------------------------------------------------

const draw = () => {
  if (frameCount() % FPS_LOGGING_FRAME_PERIOD === 0) console.log({ fps: fps() })

  const nowMillis = millis()
  const dtRealSeconds =
    lastPhysicsMillis === null
      ? 1 / FPS
      : Math.min(0.25, Math.max(0, (nowMillis - lastPhysicsMillis) / 1000))
  lastPhysicsMillis = nowMillis

  const simulationDeltaSeconds =
    dtRealSeconds * SIMULATION_SECONDS_PER_REAL_SECOND

  background('black')

  rotateX(PI / 20)

  if (autoRotationEnabled) rotateY(-millis() / 5000)
  else rotateY(PI / 6)

  render3dAxes()

  // renderDebugHud(dtRealSeconds, simulationDeltaSeconds)

  // isolateTransformations(() => {
  //   rotateX(PI / 2)
  //   rect2d(550, 550, { color: 'white', opacity: 0.05, isDoubleSided: true })
  // })

  // if (frameCount() % 500 === 0)
  //   logJson({
  //     earth: { velocity: earth.velocity, position: earth.position },
  //   })

  timesForEachN([bodies.length, bodies.length], (i, j) => {
    if (i !== j) {
      const bodyA = bodies[i]
      const bodyB = bodies[j]

      bodyA.applyForce(bodyA.attractionForceFrom(bodyB))
    }
  })

  bodies.forEach(body => {
    // if (body !== sun) body.applyForce(body.attractionForceFrom(sun))

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
