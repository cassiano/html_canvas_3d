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
  EARTH_MOON_CENTERS_DISTANCE_IN_M,
} from './main.ts'
import { earth, MOON_ORBITAL_PERIOD_IN_SECONDS, KM_TO_M } from './main.ts'
import { DEFAULT_RADIUS_SCALE, DEFAULT_DISTANCE_SCALE, G, AU } from './main.ts'
import { assertIsNotUndefined } from '../utils.ts'
import { rotateY } from '../primitives.ts'

/**
 * A celestial body of the simulated solar system.
 *
 * In addition to the physical state provided by {@link Mover3D}, the class
 * knows how to draw the body as a sphere, how to draw the orbit it follows
 * around the Sun, and how much gravitational pull it exerts on the other
 * bodies of the simulation.
 */
export class AstronomicalBody extends Mover3D {
  /**
   * Creates a celestial body and places it on its orbit around the Sun.
   *
   * The body starts at its distance from the Sun and moves tangentially at
   * the speed implied by its orbital period.
   *
   * @param name - The body's name, used to identify it in the simulation.
   * @param radius - The body's mean radius, in metres.
   * @param distanceFromSun - The body's mean distance from the Sun's centre,
   *   in metres.
   * @param mass - The body's mass, in kg.
   * @param color - The CSS color used to draw the body.
   * @param orbitalPeriod - The body's sidereal orbital period, in seconds. A
   *   value of `0` means the body does not orbit.
   * @param radiusCustomScale - The factor applied to the body's real radius
   *   when drawing it. Defaults to the shared default radius scale.
   * @param renderRings - An optional callback that draws the rings around
   *   the body. It receives the body's real radius, in metres.
   */
  constructor(
    public name: string,
    public radius: number,
    public distanceFromSun: number,
    mass: number,
    public color: string,
    public orbitalPeriod: number,
    public radiusCustomScale?: number,
    public renderRings?: (radius: number) => void,
  ) {
    const initialPosition = $v(distanceFromSun, 0, 0)

    const initialVelocity =
      orbitalPeriod === 0
        ? ZERO_VECTOR.clone()
        : $v(0, 0, (TWO_PI * distanceFromSun) / orbitalPeriod)

    if (name === 'moon') {
      initialPosition.y = EARTH_MOON_CENTERS_DISTANCE_IN_M

      const initialVelocityValue =
        ((TWO_PI * EARTH_MOON_CENTERS_DISTANCE_IN_M) /
          MOON_ORBITAL_PERIOD_IN_SECONDS) *
        cos(PI / 4)

      initialVelocity.x += initialVelocityValue
      initialVelocity.z += initialVelocityValue
    }

    super(mass, initialPosition, initialVelocity)
  }

  /**
   * Draws the body, its optional rings, and the orbit it follows.
   *
   * The body is drawn at its current position, while the orbit is drawn as
   * a circle centred on the Sun — or on the Earth, for the Moon.
   *
   * @returns Nothing; the body and its orbit are drawn on the canvas.
   * @throws {TypeError} When the Earth is missing from the simulation, since
   *   the Earth is used as a reference to place the bodies.
   */
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

      this.renderRings?.(this.radius)
    })

    isolateTransformations(() => {
      if (isMoon) {
        assertIsNotUndefined(earth)

        translate(earth.position.clone().mult(DEFAULT_DISTANCE_SCALE))
        rotateY(-PI / 4)

        circlePerimeter2d(
          EARTH_MOON_CENTERS_DISTANCE_IN_M *
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
              0.35 * AU * KM_TO_M,
              1.5 * AU * KM_TO_M,
              DEFAULT_CIRCLE_SEGMENTS,
              720,
              true,
            ),
          ),
        })
      }
    })
  }

  /**
   * Applies the gravitational pull that this body exerts on another body.
   *
   * The attraction is accumulated by the other body, which turns it into an
   * acceleration during the next simulation step.
   *
   * @param other - The body being attracted.
   * @returns Nothing; the other body's accumulated acceleration is updated
   *   in place.
   * @throws {Error} When both bodies are at the same position, because the
   *   direction of the attraction then has no magnitude to preserve.
   * @throws {Error} When the other body's mass is `0`, because the force
   *   cannot be divided by it.
   */
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
