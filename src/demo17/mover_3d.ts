import { Vector3d } from '../vector_3d.ts'
import { ZERO_VECTOR } from '../constants.ts'

/**
 * A body moving in 3D space under the influence of forces.
 *
 * The base class only keeps track of the body's mass, position, velocity and
 * accumulated acceleration. Subclasses provide whatever behaviour is specific
 * to the kind of body they represent.
 */
export abstract class Mover3D {
  /**
   * The acceleration accumulated since the last update.
   */
  acceleration: Vector3d

  /**
   * Creates a mover.
   *
   * @param mass - The body's mass. It must be greater than zero for forces to
   *   have any effect on the body.
   * @param position - The body's initial position, in world coordinates.
   * @param velocity - The body's initial velocity, in world units per frame.
   */
  constructor(
    public mass: number,
    public position: Vector3d,
    public velocity: Vector3d,
  ) {
    this.acceleration = ZERO_VECTOR.clone()
  }

  /**
   * Advances the body by one frame.
   *
   * The body's position and velocity are updated in place, and the
   * accumulated acceleration is cleared, so that forces have to be applied
   * again on every frame.
   *
   * @returns Nothing; the body's state is mutated in place.
   */
  update() {
    this.position.add(this.velocity)
    this.velocity.add(this.acceleration)

    this.acceleration.mult(0)
  }

  // F = m . a  => a = F / m
  /**
   * Applies a force to the body.
   *
   * @param force - The force to apply, in world units.
   * @returns Nothing; the body's accumulated acceleration is mutated in place.
   * @throws {Error} With the message `Sorry, but division by 0 is not
   *   supported`, when the body's mass is `0`, because the resulting
   *   acceleration would be undefined.
   */
  applyForce(force: Vector3d) {
    this.addAcceleration(force.clone().div(this.mass))
  }

  /**
   * Adds an acceleration to the body's accumulated acceleration.
   *
   * @param acceleration - The acceleration to add.
   * @returns Nothing; the body's accumulated acceleration is mutated in place.
   */
  addAcceleration(acceleration: Vector3d) {
    this.acceleration.add(acceleration)
  }
}
