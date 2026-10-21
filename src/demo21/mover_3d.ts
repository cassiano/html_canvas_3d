import { Vector3d } from '../vector_3d.ts'
import { ZERO_VECTOR } from '../constants.ts'

/**
 * A body that moves through the scene under the influence of forces.
 *
 * The class owns the physical state of a body — its mass, position,
 * velocity and acceleration — and provides the operations needed to
 * integrate that state over time. Subclasses are responsible for drawing
 * the body on the canvas.
 */
export abstract class Mover3D {
  /**
   * Creates a body with the given physical state.
   *
   * @param mass - The body's mass, in kg. It must be greater than zero for
   *   forces to be converted into accelerations.
   * @param position - The body's position, in metres.
   * @param velocity - The body's velocity, in metres per second.
   * @param acceleration - The body's accumulated acceleration, in metres per
   *   second squared. Defaults to the zero vector.
   */
  constructor(
    public mass: number,
    public position: Vector3d,
    public velocity: Vector3d,
    public acceleration: Vector3d = ZERO_VECTOR.clone(),
  ) {}

  // [/doc_img/mover_3d.ts/2026-07-30-11-19-15.png]
  /**
   * Advances the body by one time step.
   *
   * The acceleration accumulated since the previous call is applied to the
   * velocity, and the resulting velocity is applied to the position. The
   * accumulated acceleration is then cleared, so every force must be
   * applied again before the next step.
   *
   * @param dt - The length of the time step, in seconds. Defaults to `1`.
   * @returns Nothing; the body's state is updated in place.
   */
  update(dt = 1) {
    this.velocity.add(this.acceleration.clone().mult(dt))
    this.position.add(this.velocity.clone().mult(dt))

    this.acceleration.mult(0)
  }

  // F = m . a  => a = F / m
  /**
   * Applies a force to the body, turning it into an acceleration.
   *
   * The acceleration is accumulated until the next call to
   * {@link Mover3D.update}.
   *
   * @param force - The force acting on the body, in newtons.
   * @returns Nothing; the body's accumulated acceleration is updated in
   *   place.
   * @throws {Error} When the body's mass is `0`, because the force cannot be
   *   divided by it.
   */
  applyForce(force: Vector3d) {
    this.addAcceleration(force.clone().div(this.mass))
  }

  /**
   * Adds an acceleration directly to the body's accumulated acceleration.
   *
   * @param acceleration - The acceleration to add, in metres per second
   *   squared.
   * @returns Nothing; the body's accumulated acceleration is updated in
   *   place.
   */
  addAcceleration(acceleration: Vector3d) {
    this.acceleration.add(acceleration)
  }

  /**
   * Draws the body on the canvas.
   *
   * @returns Nothing; the body is drawn as a side effect.
   */
  abstract render(): void
}
