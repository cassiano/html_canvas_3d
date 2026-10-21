// deno-lint-ignore-file constructor-super

import {
  cube,
  isolateTransformations,
  rotateX,
  rotateY,
  rotateZ,
  sphere,
  translate,
} from '../primitives.ts'
import { millis } from '../utils.ts'
import { Vector3d } from '../vector_3d.ts'
import { Mover3D } from './mover_3d.ts'

/**
 * A mover drawn as a yellow sphere enclosed in a translucent black cube.
 *
 * Both shapes share the mover's position and rotate continuously, so the
 * cube appears to tumble around the sphere it contains.
 */
export class CubeSphereMover extends Mover3D {
  /** The radius of the enclosed sphere, in world units. */
  radius: number

  /**
   * Creates a cube-and-sphere mover at the given position.
   *
   * @param mass - The mass of the mover.
   * @param position - The initial world-space position of the mover.
   * @param radius - The radius of the enclosed sphere, in world units.
   */
  constructor(mass: number, position: Vector3d, radius: number)
  /**
   * Creates a cube-and-sphere mover at the given coordinates.
   *
   * @param mass - The mass of the mover.
   * @param x - The initial position on the X-axis.
   * @param y - The initial position on the Y-axis.
   * @param z - The initial position on the Z-axis.
   * @param radius - The radius of the enclosed sphere, in world units.
   */
  constructor(mass: number, x: number, y: number, z: number, radius: number)
  constructor(
    mass: number,
    xOrPosition: number | Vector3d,
    yOrRadius: number,
    z?: number,
    radius?: number,
  ) {
    if (typeof xOrPosition === 'number') {
      super(mass, xOrPosition, yOrRadius, z!)

      this.radius = radius!
    } else {
      super(mass, xOrPosition)

      this.radius = yOrRadius
    }
  }

  /**
   * Returns the distance between the mover's center and the border of its
   * enclosing cube.
   *
   * @returns The radius of the sphere, in world units.
   */
  override distanceFromCenterToBorder() {
    return this.radius
  }

  /**
   * Draws the sphere and its enclosing cube at the mover's current position.
   *
   * The shapes rotate at a constant rate over time, independently of the
   * mover's physics.
   *
   * @returns Nothing; the function draws to the canvas.
   */
  override render() {
    isolateTransformations(() => {
      translate(this.position)

      rotateX(millis() / 1000)
      rotateY(millis() / 2000)
      rotateZ(millis() / 3000)

      sphere(this.radius, { color: 'yellow', lineWidth: 1 })
      cube(this.radius * 2 * 1.1, {
        color: 'black',
        lineWidth: 2,
        opacity: 0.15,
      })
    })
  }
}
