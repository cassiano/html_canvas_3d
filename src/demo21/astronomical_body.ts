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
  DEFAULT_RADIUS_SCALE,
  DEFAULT_DISTANCE_SCALE,
  EARTH_DAY_IN_SECONDS,
  G,
  AU,
} from './main.ts'

export class AstronomicalBody extends Mover3D {
  constructor(
    public name: string,
    public radius: number,
    public sunDistance: number,
    public mass: number,
    public color: string,
    public orbitalPeriod: number,
    public radiusCustomScale?: number,
  ) {
    super(
      mass,
      $v(sunDistance, 0, 0),
      orbitalPeriod === 0
        ? ZERO_VECTOR.clone()
        : $v(
            0,
            0,
            (TWO_PI * sunDistance) / (orbitalPeriod * EARTH_DAY_IN_SECONDS),
          ),
    )
  }

  render() {
    const radius =
      this.radius * (this.radiusCustomScale ?? DEFAULT_RADIUS_SCALE)

    isolateTransformations(() => {
      translate(this.position.clone().mult(DEFAULT_DISTANCE_SCALE))

      sphere(radius, {
        color: this.color,
        latitudeLines: 16,
        longitudeLines: 16,
        lineWidth: 0.01,
      })
    })

    isolateTransformations(() => {
      rotateX(PI / 2)

      circlePerimeter2d(this.sunDistance * DEFAULT_DISTANCE_SCALE, {
        color: this.color,
        lineWidth: 1,
        // More segments for larger orbits to make them smoother.
        circleSegments: map(
          this.sunDistance,
          0.35 * AU * 1000,
          1.5 * AU * 1000,
          DEFAULT_CIRCLE_SEGMENTS,
          360,
          true,
        ),
      })
    })
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
