import { $v, Vector3d } from '../vector_3d.ts'
import { ZERO_VECTOR } from '../constants.ts'

/**
 * The base class of every object moved by the physics simulation.
 *
 * A mover keeps track of its position, velocity and acceleration, and is
 * subject to forces applied to it. Subclasses decide how the mover is drawn
 * and how far its center is from its own border, which is used to detect
 * collisions with the floor.
 */
export abstract class Mover3D {
  /** The current world-space position of the mover. */
  position: Vector3d
  /** The current world-space velocity of the mover. */
  velocity: Vector3d
  /**
   * The acceleration accumulated during the current frame, before it is
   * applied to the velocity.
   */
  acceleration: Vector3d

  /**
   * Creates a mover at the given position, with no initial velocity nor
   * acceleration.
   *
   * @param mass - The mass of the mover, used to turn forces into
   *   accelerations.
   * @param position - The initial world-space position of the mover.
   */
  constructor(mass: number, position: Vector3d)
  /**
   * Creates a mover at the given coordinates, with no initial velocity nor
   * acceleration.
   *
   * @param mass - The mass of the mover, used to turn forces into
   *   accelerations.
   * @param x - The initial position on the X-axis.
   * @param y - The initial position on the Y-axis.
   * @param z - The initial position on the Z-axis.
   */
  constructor(mass: number, x: number, y: number, z: number)
  constructor(
    public mass: number,
    xOrPosition: number | Vector3d,
    y?: number,
    z?: number,
  ) {
    this.position =
      typeof xOrPosition === 'number' ? $v(xOrPosition, y!, z!) : xOrPosition
    this.velocity = ZERO_VECTOR.clone()
    this.acceleration = ZERO_VECTOR.clone()
  }

  /**
   * Advances the mover's physics by one frame.
   *
   * The current velocity is added to the position, the accumulated
   * acceleration is added to the velocity, and the acceleration is reset for
   * the next frame. The acceleration is not applied while the mover is
   * touching the bottom.
   *
   * @param height - The height of the floor the mover bounces on, used to
   *   detect whether the mover is touching it.
   * @returns Nothing; the function mutates the mover's position, velocity and
   *   acceleration in place.
   */
  update(height: number) {
    this.position.add(this.velocity)

    if (!this.touchedBottom(height)) this.velocity.add(this.acceleration)

    this.acceleration.mult(0)
  }

  // F = m . a  => a = F / m
  /**
   * Applies a force to the mover, turning it into an acceleration scaled by
   * the mover's mass.
   *
   * The resulting acceleration is accumulated, and is taken into account by
   * the next call to {@link Mover3D.update}.
   *
   * @param force - The force to apply, in world units.
   * @returns Nothing; the function accumulates the mover's acceleration in
   *   place.
   * @throws {Error} When the mover's mass is zero, because the force cannot
   *   be divided by it.
   */
  applyForce(force: Vector3d) {
    this.addAcceleration(force.clone().div(this.mass))
  }

  /**
   * Accumulates an acceleration on the mover, without applying it to the
   * velocity yet.
   *
   * @param acceleration - The acceleration to accumulate.
   * @returns Nothing; the function mutates the mover's acceleration in place.
   */
  addAcceleration(acceleration: Vector3d) {
    this.acceleration.add(acceleration)
  }

  /**
   * Draws the mover in the scene.
   *
   * @returns Nothing; the function draws to the canvas.
   */
  abstract render(): void

  /**
   * Returns the distance between the mover's center and its own border.
   *
   * @returns The distance from the center to the border, in world units.
   */
  abstract distanceFromCenterToBorder(): number

  /**
   * Tells whether the mover is currently touching the floor.
   *
   * @param height - The height of the floor the mover bounces on.
   * @returns `true` when the bottom of the mover has reached the floor.
   */
  touchedBottom(height: number) {
    return -this.position.y + this.distanceFromCenterToBorder() > height
  }

  /**
   * Makes the mover bounce off the floor, when it is touching it.
   *
   * The vertical component of the velocity is inverted, so the mover moves
   * upwards again.
   *
   * @param height - The height of the floor the mover bounces on.
   * @returns Nothing; the function mutates the mover's velocity in place.
   */
  checkEdges(height: number) {
    if (this.touchedBottom(height)) this.velocity.y *= -1
  }
}
