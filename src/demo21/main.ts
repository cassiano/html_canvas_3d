import { FPS, FPS_LOGGING_FRAME_PERIOD } from '../constants.ts'
import { createFrameLoop, fps, frameCount, millis } from '../utils.ts'
import {
  background,
  render3dScene,
  render3dAxes,
  resetTransformationMatrix,
  text2d,
} from '../primitives.ts'
import { $v } from '../vector_3d.ts'
import { PI } from '../math_utils.ts'
import { translate, circlePerimeter2d } from '../primitives.ts'
import { isolateTransformations } from '../primitives.ts'
import { autoRotationEnabled, sphere, rotateY, rotateX } from '../primitives.ts'

// -------------------------------------------------------------------------------------------------

const G = 6.67428e-11 // Universal gravitational constant, in m³ / (kg x s²).
const AU = 149597870.7 // Astronomical Unit (in km).
const EARTH_YEAR_IN_DAYS = 365.256363004 // Sidereal year.
const EARTH_DAY_IN_SECONDS = 24 * 3600
const EARTH_YEAR_IN_SECONDS = EARTH_YEAR_IN_DAYS * EARTH_DAY_IN_SECONDS
const EARTH_MOON_DISTANCE = 384399 // Mean Earth-Moon distance in km.

const DEFAULT_RADIUS_RATIO = 1 / 5000
const DEFAULT_DISTANCE_RATIO = 400 / AU / 10 // Scale down distances to fit the canvas.

type SolarSystemBodyType = {
  radius: number
  radiusRatio?: number
  sunDistance: number
  density: number
  color: string
  siderealOrbitalPeriod: number
}

const SOLAR_SYSTEM_DATA: Record<string, SolarSystemBodyType> = {
  sun: {
    radius: 695700, // Mean radius in km.
    radiusRatio: DEFAULT_RADIUS_RATIO / 7.5, // Scale down the sun's radius to fit the canvas.
    sunDistance: 0, // In AU.
    density: 1.408, // In g/cm³.
    color: 'yellow',
    siderealOrbitalPeriod: 0, // In (Earth) days.
  },
  mercury: {
    radius: 2439.7, // Mean radius in km.
    sunDistance: 0.387098, // In AU.
    density: 5.427, // In g/cm³.
    color: 'brown',
    siderealOrbitalPeriod: 87.9691, // In days.
  },
  venus: {
    radius: 6051.8, // Mean radius in km.
    sunDistance: 0.723332, // In AU.
    density: 5.243, // In g/cm³.
    color: 'gray',
    siderealOrbitalPeriod: 224.701, // In days.
  },
  earth: {
    radius: 6371, // Mean radius in km.
    sunDistance: 1, // In AU.
    density: 5.514, // In g/cm³.
    color: 'blue',
    siderealOrbitalPeriod: EARTH_YEAR_IN_DAYS, // In days.
  },
  moon: {
    radius: 1737.4, // In km.
    sunDistance: 1 + EARTH_MOON_DISTANCE / AU, // In AU.
    density: 3.344, // In g/cm³.
    color: 'gray',
    siderealOrbitalPeriod: 27.321582, // In days.
  },
  mars: {
    radius: 3389.5, // Mean radius in km.
    sunDistance: 1.523679, // In AU.
    density: 3.934, // In g/cm³.
    color: 'red',
    siderealOrbitalPeriod: 686.98, // In days.
  },
  jupiter: {
    radius: 69911, // Mean radius in km.
    sunDistance: 5.2044, // In AU.
    density: 1.326, // In g/cm³.
    color: 'gray',
    siderealOrbitalPeriod: 4332.59, // In days.
  },
  saturn: {
    radius: 58232, // Mean radius in km.
    sunDistance: 9.5826, // In AU.
    density: 0.687, // In g/cm³.
    color: 'orange',
    siderealOrbitalPeriod: 10759.22, // In days.
  },
  // uranus: {
  //   radius: 25362, // Mean radius in km.
  //   sunDistance: 19.2184, // In AU.
  //   density: 1.271, // In g/cm³.
  //   color: 'cyan',
  //   siderealOrbitalPeriod: 30688.5, // In days.
  // },
  // neptune: {
  //   radius: 24622, // Mean radius in km.
  //   sunDistance: 30.11, // In AU.
  //   density: 1.638, // In g/cm³.
  //   color: 'blue',
  //   siderealOrbitalPeriod: 60182, // In days.
  // },
}

// -------------------------------------------------------------------------------------------------

const renderSolarSystemBody = (
  planet: SolarSystemBodyType,
  radiusRatio: number,
) => {
  const radius = planet.radius * (planet.radiusRatio ?? radiusRatio)

  isolateTransformations(() => {
    translate(planet.sunDistance * AU * DEFAULT_DISTANCE_RATIO, 0, 0)

    sphere(radius, {
      color: planet.color,
      latitudeLines: 16,
      longitudeLines: 16,
      lineWidth: 0.01,
    })
  })

  isolateTransformations(() => {
    rotateX(PI / 2)

    circlePerimeter2d(planet.sunDistance * AU * DEFAULT_DISTANCE_RATIO, {
      color: planet.color,
      lineWidth: 0.3,
    })
  })
}

// -------------------------------------------------------------------------------------------------

const draw = () => {
  if (frameCount() % FPS_LOGGING_FRAME_PERIOD === 0) console.log({ fps: fps() })

  background('black')

  rotateX(PI / 20)

  if (autoRotationEnabled) rotateY(-millis() / 5000)
  else rotateY(PI / 6)

  render3dAxes()

  // isolateTransformations(() => {
  //   rotateX(PI / 2)
  //   rect2d(550, 550, { color: 'white', opacity: 0.05, isDoubleSided: true })
  // })

  Object.values(SOLAR_SYSTEM_DATA).forEach(planet => {
    renderSolarSystemBody(planet, DEFAULT_RADIUS_RATIO)
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
