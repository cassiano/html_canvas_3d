import { floor, map, TWO_PI, HALF_PI, cos, PI } from '../math_utils.ts'
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
import { earth, MOON_ORBITAL_PERIOD_IN_SECONDS } from './main.ts'
import { DEFAULT_RADIUS_SCALE, DEFAULT_DISTANCE_SCALE, G, AU } from './main.ts'
import { assertIsNotUndefined } from '../utils.ts'
import { rotateY } from '../primitives.ts'

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
        : $v(0, 0, (TWO_PI * distanceFromSun) / orbitalPeriod)

    if (name === 'moon') {
      initialPosition.y = EARTH_MOON_CENTERS_DISTANCE_IN_METERS

      const initialVelocityValue =
        ((TWO_PI * EARTH_MOON_CENTERS_DISTANCE_IN_METERS) /
          MOON_ORBITAL_PERIOD_IN_SECONDS) *
        cos(PI / 4)

      initialVelocity.x += initialVelocityValue
      initialVelocity.z += initialVelocityValue
    }

    super(mass, initialPosition, initialVelocity)
  }

  override render() {
    const radius =
      this.radius * (this.radiusCustomScale ?? DEFAULT_RADIUS_SCALE)

    const isMoon = this.name === 'moon'

    isolateTransformations(() => {
      assertIsNotUndefined(earth)

      const finalPosition = isMoon
        ? earth.position.lerp(this.position, EARTH_MOON_DISTANCE_SCALE)
        : this.position.clone()

      translate(finalPosition.mult(DEFAULT_DISTANCE_SCALE))

      const latLongLines = floor(map(radius, 0, 150, 12, 32, true))

      sphere(radius, {
        color: this.color,
        latitudeLines: latLongLines,
        longitudeLines: latLongLines,
        lineWidth: 0.05,
      })
    })

    isolateTransformations(() => {
      if (isMoon) {
        assertIsNotUndefined(earth)

        translate(earth.position.clone().mult(DEFAULT_DISTANCE_SCALE))
        rotateY(-PI / 4)

        circlePerimeter2d(
          earth.position.dist(this.position) *
            EARTH_MOON_DISTANCE_SCALE *
            DEFAULT_DISTANCE_SCALE,
          {
            color: this.color,
            lineWidth: 0.75,
          },
        )
      } else {
        rotateX(-HALF_PI)

        circlePerimeter2d(this.distanceFromSun * DEFAULT_DISTANCE_SCALE, {
          color: this.color,
          lineWidth: 1,
          // More segments for larger orbits to make them smoother.
          circleSegments: floor(
            map(
              this.distanceFromSun,
              0.35 * AU * 1000,
              1.5 * AU * 1000,
              DEFAULT_CIRCLE_SEGMENTS,
              720,
              true,
            ),
          ),
        })
      }
    })
  }

  attract(other: AstronomicalBody) {
    const direction = this.position.clone().sub(other.position)
    const distanceSq = direction.magSq()

    // [/doc_img/astronomical_body.ts/2026-07-29-18-09-24.png]
    const gravitationalAttraction = direction.setMag(
      (G * this.mass * other.mass) / distanceSq,
    )

    other.applyForce(gravitationalAttraction)
  }
}
