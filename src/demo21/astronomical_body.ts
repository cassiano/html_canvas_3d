import { map, PI, TWO_PI } from '../math_utils.ts'
import {
  isolateTransformations,
  rotateX,
  circlePerimeter2d,
  translate,
  sphere,
} from '../primitives.ts'
import { $v } from '../vector_3d.ts'
import { Mover3D } from './mover_3d.ts'
import { ZERO_VECTOR, DEFAULT_CIRCLE_SEGMENTS } from '../constants.ts'
import {
  EARTH_MOON_DISTANCE_SCALE,
  EARTH_MOON_CENTERS_DISTANCE_IN_METERS,
} from './main.ts'
import { MOON_ORBITAL_PERIOD_IN_DAYS, earth } from './main.ts'
import {
  DEFAULT_RADIUS_SCALE,
  DEFAULT_DISTANCE_SCALE,
  EARTH_DAY_IN_SECONDS,
  G,
  AU,
} from './main.ts'
import { assertIsNotUndefined } from '../utils.ts'

export class AstronomicalBody extends Mover3D {
  constructor(
    public name: string,
    public radius: number,
    public distanceFromSun: number,
    mass: number,
    public color: string,
    public orbitalPeriod: number,
    public radiusCustomScale?: number,
  ) {
    const initialPosition = $v(distanceFromSun, 0, 0)

    const initialVelocity =
      orbitalPeriod === 0
        ? ZERO_VECTOR.clone()
        : $v(
            0,
            0,
            (TWO_PI * distanceFromSun) / (orbitalPeriod * EARTH_DAY_IN_SECONDS),
          )

    if (name === 'moon') {
      initialPosition.y = EARTH_MOON_CENTERS_DISTANCE_IN_METERS

      initialVelocity.z +=
        (TWO_PI * EARTH_MOON_CENTERS_DISTANCE_IN_METERS) /
        (MOON_ORBITAL_PERIOD_IN_DAYS * EARTH_DAY_IN_SECONDS)
    }

    super(mass, initialPosition, initialVelocity)
  }

  render() {
    const radius =
      this.radius * (this.radiusCustomScale ?? DEFAULT_RADIUS_SCALE)

    const isMoon = this.name === 'moon'

    isolateTransformations(() => {
      if (isMoon) {
        assertIsNotUndefined(earth)

        const scaledPositionDiff = earth.position.lerp(
          this.position,
          EARTH_MOON_DISTANCE_SCALE,
        )

        translate(scaledPositionDiff.mult(DEFAULT_DISTANCE_SCALE))
      } else {
        translate(this.position.clone().mult(DEFAULT_DISTANCE_SCALE))
      }

      sphere(radius, {
        color: this.color,
        latitudeLines: 16,
        longitudeLines: 16,
        lineWidth: 0.01,
      })
    })

    if (!isMoon) {
      isolateTransformations(() => {
        rotateX(PI / 2)

        circlePerimeter2d(this.distanceFromSun * DEFAULT_DISTANCE_SCALE, {
          color: this.color,
          lineWidth: 1,
          // More segments for larger orbits to make them smoother.
          circleSegments: map(
            this.distanceFromSun,
            0.35 * AU * 1000,
            1.5 * AU * 1000,
            DEFAULT_CIRCLE_SEGMENTS,
            360,
            true,
          ),
        })
      })
    }
  }

  attract(other: AstronomicalBody) {
    const direction = this.position.clone().sub(other.position)
    const distanceSq = direction.magSq()

    const gravitacionalAttraction = direction
      .normalize()
      .mult((G * this.mass * other.mass) / distanceSq)

    other.applyForce(gravitacionalAttraction)
  }

  updateWithDelta(dt: number) {
    // Semi-implicit Euler: update velocity from acceleration, then position from velocity.
    this.velocity.add(this.acceleration.clone().mult(dt))
    this.position.add(this.velocity.clone().mult(dt))

    this.acceleration.mult(0)
  }
}
