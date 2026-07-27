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

const DEFAULT_RADIUS_RATIO = 1 / 5e6
const DEFAULT_DISTANCE_RATIO = 400 / AU / 1e4 // Scale down distances to fit the canvas.
const DEFAULT_VELOCITY_RATIO = EARTH_YEAR_IN_SECONDS
type SolarSystemBodyType = {
  radius: number // Mean radius in km.
  radiusRatio?: number
  sunDistance: number // In AU.
  density: number // In g/cm³.
  color: string
  orbitalPeriod: number // In (Earth) days, aka sidereal orbital period.
}

const SOLAR_SYSTEM_DATA: Record<string, SolarSystemBodyType> = {
  sun: {
    radius: 695700,
    radiusRatio: DEFAULT_RADIUS_RATIO / 6, // Scale down the sun's radius to fit the canvas.
    sunDistance: 0,
    density: 1.408,
    color: 'yellow',
    orbitalPeriod: 0,
  },
  mercury: {
    radius: 2439.7,
    radiusRatio: DEFAULT_RADIUS_RATIO * 3,
    sunDistance: 0.387098,
    density: 5.427,
    color: 'brown',
    orbitalPeriod: 87.9691,
  },
  venus: {
    radius: 6051.8,
    radiusRatio: DEFAULT_RADIUS_RATIO * 3,
    sunDistance: 0.723332,
    density: 5.243,
    color: 'gray',
    orbitalPeriod: 224.701,
  },
  earth: {
    radius: 6371,
    radiusRatio: DEFAULT_RADIUS_RATIO * 3,
    sunDistance: 1,
    density: 5.514,
    color: 'blue',
    orbitalPeriod: EARTH_YEAR_IN_DAYS,
  },
  // moon: {
  //   radius: 1737.4,
  //   sunDistance: 1 + EARTH_MOON_DISTANCE / AU,
  //   density: 3.344,
  //   color: 'gray',
  //   orbitalPeriod: 27.321582,
  // },
  mars: {
    radius: 3389.5,
    radiusRatio: DEFAULT_RADIUS_RATIO * 3,
    sunDistance: 1.523679,
    density: 3.934,
    color: 'red',
    orbitalPeriod: 686.98,
  },
  jupiter: {
    radius: 69911,
    sunDistance: 5.2044,
    density: 1.326,
    color: 'gray',
    orbitalPeriod: 4332.59,
  },
  saturn: {
    radius: 58232,
    sunDistance: 9.5826,
    density: 0.687,
    color: 'orange',
    orbitalPeriod: 10759.22,
  },
  // uranus: {
  //   radius: 25362,
  //   sunDistance: 19.2184,
  //   density: 1.271,
  //   color: 'cyan',
  //   orbitalPeriod: 30688.5,
  // },
  // neptune: {
  //   radius: 24622,
  //   sunDistance: 30.11,
  //   density: 1.638,
  //   color: 'blue',
  //   orbitalPeriod: 60182,
  // },
}

// -------------------------------------------------------------------------------------------------

class CelestialBody extends Mover3D {
  constructor(
    public name: string,
    public radius: number,
    public sunDistance: number,
    public density: number,
    public color: string,
    public orbitalPeriod: number,
    public radiusRatio?: number,
  ) {
    const volume = (4 / 3) * PI * radius ** 3
    const mass = volume * density

    super(
      mass,
      $v(sunDistance, 0, 0),
      orbitalPeriod === 0
        ? ZERO_VECTOR.clone()
        : $v(
            0,
            0,
            ((2 * PI * sunDistance * DEFAULT_DISTANCE_RATIO) / orbitalPeriod) *
              DEFAULT_VELOCITY_RATIO,
          ),
    )
  }

  render() {
    const radius = this.radius * (this.radiusRatio ?? DEFAULT_RADIUS_RATIO)

    isolateTransformations(() => {
      translate(this.position.clone().mult(DEFAULT_DISTANCE_RATIO))

      sphere(radius, {
        color: this.color,
        latitudeLines: 16,
        longitudeLines: 16,
        lineWidth: 0.01,
      })
    })

    isolateTransformations(() => {
      rotateX(PI / 2)

      circlePerimeter2d(this.sunDistance * DEFAULT_DISTANCE_RATIO, {
        color: this.color,
        lineWidth: 0.3,
      })
    })
  }

  attractionForceFrom(other: CelestialBody) {
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
    orbitalPeriod: siderealOrbitalPeriod,
    radiusRatio,
  } = data

  return new CelestialBody(
    name,
    radius * 1000, // Convert radius from km to m.
    sunDistance * AU * 1000, // Convert sunDistance from AU to m.
    density * (1e-3 / 1e-2 ** 3), // Convert density from g/cm³ to kg/m³.
    color,
    siderealOrbitalPeriod,
    radiusRatio,
  )
})

const sun = bodies.find(body => body.name === 'sun')

if (!sun) throw new Error('Sun not found in solar system data.')

// logJson({ sun: { mass: sun.mass, radius: sun.radius, density: sun.density } })

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

  const earth = bodies.find(body => body.name === 'earth')
  if (!earth) throw new Error('Earth not found in solar system data.')
  logJson({
    earth: { velocity: earth.velocity, position: earth.position },
  })

  bodies.forEach(body => {
    if (body !== sun) body.applyForce(body.attractionForceFrom(sun))

    body.update()
    body.render()

    // logJson({
    //   name: body.name,
    //   velocity: body.velocity,
    //   position: body.position,
    // })
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
