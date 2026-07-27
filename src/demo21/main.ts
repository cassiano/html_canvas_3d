import { FPS, FPS_LOGGING_FRAME_PERIOD, ZERO_VECTOR } from '../constants.ts'
import { createFrameLoop, fps, frameCount, millis, logJson } from '../utils.ts'
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
import { Mover3D } from './mover_3d.ts'

// -------------------------------------------------------------------------------------------------

const G = 6.67428e-11 // Universal gravitational constant, in m³ / (kg x s²).
const AU = 149597870.7 // Astronomical Unit (in km).
const EARTH_YEAR_IN_DAYS = 365.256363004 // Sidereal year.
const EARTH_DAY_IN_SECONDS = 24 * 3600
const EARTH_YEAR_IN_SECONDS = EARTH_YEAR_IN_DAYS * EARTH_DAY_IN_SECONDS
const EARTH_MOON_DISTANCE = 384399 // Mean Earth-Moon distance in km.

const DEFAULT_RADIUS_RATIO = 1 / 5000
const DEFAULT_DISTANCE_RATIO = 400 / AU / 10 // Scale down distances to fit the canvas.
const DEFAULT_VELOCITY_RATIO = 20

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
    radiusRatio: DEFAULT_RADIUS_RATIO / 6, // Scale down the sun's radius to fit the canvas.
    sunDistance: 0, // In AU.
    density: 1.408, // In g/cm³.
    color: 'yellow',
    siderealOrbitalPeriod: 0, // In (Earth) days.
  },
  mercury: {
    radius: 2439.7, // Mean radius in km.
    radiusRatio: DEFAULT_RADIUS_RATIO * 3,
    sunDistance: 0.387098, // In AU.
    density: 5.427, // In g/cm³.
    color: 'brown',
    siderealOrbitalPeriod: 87.9691, // In days.
  },
  venus: {
    radius: 6051.8, // Mean radius in km.
    radiusRatio: DEFAULT_RADIUS_RATIO * 3,
    sunDistance: 0.723332, // In AU.
    density: 5.243, // In g/cm³.
    color: 'gray',
    siderealOrbitalPeriod: 224.701, // In days.
  },
  earth: {
    radius: 6371, // Mean radius in km.
    radiusRatio: DEFAULT_RADIUS_RATIO * 3,
    sunDistance: 1, // In AU.
    density: 5.514, // In g/cm³.
    color: 'blue',
    siderealOrbitalPeriod: EARTH_YEAR_IN_DAYS, // In days.
  },
  // moon: {
  //   radius: 1737.4, // In km.
  //   sunDistance: 1 + EARTH_MOON_DISTANCE / AU, // In AU.
  //   density: 3.344, // In g/cm³.
  //   color: 'gray',
  //   siderealOrbitalPeriod: 27.321582, // In days.
  // },
  mars: {
    radius: 3389.5, // Mean radius in km.
    radiusRatio: DEFAULT_RADIUS_RATIO * 3,
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

class SolarSystemBody extends Mover3D {
  constructor(
    public name: string,
    public radius: number,
    public sunDistance: number,
    public density: number,
    public color: string,
    public siderealOrbitalPeriod: number,
    public radiusRatio?: number,
  ) {
    const volume = (4 / 3) * PI * (radius * 1000) ** 3 // Convert radius from km to m for volume calculation.
    const mass = volume * ((density * 1) / 1000 / (1 / 100) ** 3) // Density is in g/cm³, so we convert it to kg/m³.

    super(
      mass,
      $v(sunDistance * AU * DEFAULT_DISTANCE_RATIO, 0, 0),
      siderealOrbitalPeriod === 0
        ? ZERO_VECTOR.clone()
        : $v(
            0,
            0,
            ((2 * PI * sunDistance * AU * 1000 * DEFAULT_DISTANCE_RATIO) /
              siderealOrbitalPeriod /
              24 /
              3600) *
              DEFAULT_VELOCITY_RATIO, // Convert sidereal orbital period from days to seconds.
          ),
    )
  }

  render() {
    const radius = this.radius * (this.radiusRatio ?? DEFAULT_RADIUS_RATIO)

    isolateTransformations(() => {
      translate(this.position)

      sphere(radius, {
        color: this.color,
        latitudeLines: 16,
        longitudeLines: 16,
        lineWidth: 0.01,
      })
    })

    isolateTransformations(() => {
      rotateX(PI / 2)

      circlePerimeter2d(this.sunDistance * AU * DEFAULT_DISTANCE_RATIO, {
        color: this.color,
        lineWidth: 0.3,
      })
    })
  }

  attractionForceFrom(other: SolarSystemBody) {
    const distanceSq = this.position.distSq(other.position)

    return other.position
      .clone()
      .sub(this.position)
      .normalize()
      .mult((G * this.mass * other.mass) / distanceSq)
  }
}

// -------------------------------------------------------------------------------------------------

const bodies = Object.entries(SOLAR_SYSTEM_DATA).map(([name, data]) => {
  const {
    radius,
    sunDistance,
    density,
    color,
    siderealOrbitalPeriod,
    radiusRatio,
  } = data

  return new SolarSystemBody(
    name,
    radius,
    sunDistance,
    density,
    color,
    siderealOrbitalPeriod,
    radiusRatio,
  )
})

const sun = bodies.find(body => body.name === 'sun')

if (!sun) throw new Error('Sun not found in solar system data.')

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

  bodies.forEach(body => {
    // if (body !== sun) body.applyForce(body.attractionForceFrom(sun))

    body.update()
    body.render()

    logJson({
      name: body.name,
      velocity: body.velocity,
      position: body.position,
    })
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
