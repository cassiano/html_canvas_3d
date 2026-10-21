import { point } from '../primitives.ts'
import { Vector3d } from '../vector_3d.ts'
import { Mover3D } from './mover_3d.ts'
import { map } from '../math_utils.ts'
import { PARTICLE_LIFESPAN } from './fireworks.ts'

/**
 * A single particle of a fireworks explosion.
 *
 * A particle is a physical body that moves under the forces applied to it,
 * that fades away as its lifespan runs out, and that is drawn as a square
 * point whose size shrinks over time.
 */
export class Particle extends Mover3D {
  /**
   * Creates a particle.
   *
   * @param position - The particle's initial position, in world coordinates.
   * @param velocity - The particle's initial velocity, in world units per
   *   frame.
   * @param lifespan - How many frames the particle survives before dying.
   * @param color - The color the particle is drawn with.
   * @param width - The width of the area the particle is allowed to move in.
   * @param height - The height of the area the particle is allowed to move in.
   */
  constructor(
    public position: Vector3d,
    public velocity: Vector3d,
    public lifespan: number,
    public color: string,
    public width: number,
    public height: number,
  ) {
    super(1, position, velocity)
  }

  /**
   * Advances the particle by one frame and queues it for rendering.
   *
   * The particle is moved, its lifespan is decremented, and it is added to
   * the scene's render queue.
   *
   * @returns Nothing; the particle's state is mutated in place and the
   *   particle is queued for rendering.
   */
  run() {
    this.update()
    this.lifespan--

    this.render()
  }

  /**
   * Tells whether the particle has outlived its lifespan or left the area it
   * is allowed to move in.
   *
   * @returns `true` when the particle should be removed from the scene.
   */
  isDead() {
    return this.lifespan <= 0 || this.isOffScreen()
  }

  /**
   * Queues the particle for rendering, with a size that shrinks as its
   * lifespan runs out.
   *
   * @returns Nothing; the particle is added to the scene's render queue.
   */
  private render() {
    point(this.position, {
      size: map(this.lifespan, PARTICLE_LIFESPAN, 0, 5, 0, true),
      color: this.color,
    })
  }

  /**
   * Tells whether the particle has left the area it is allowed to move in.
   *
   * Only the horizontal and vertical bounds are taken into account; the
   * particle is free to move along the depth axis.
   *
   * @returns `true` when the particle is outside the allowed area.
   */
  private isOffScreen() {
    return (
      this.position.y < -this.height / 2 ||
      this.position.x < -this.width / 2 ||
      this.position.x > this.width / 2
    )
  }
}
