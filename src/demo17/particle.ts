import { point } from '../primitives.ts'
import { Vector3d } from '../vector_3d.ts'
import { Mover2D } from './mover_2d.ts'
import { map } from '../math_utils.ts'
import { PARTICLE_LIFESPAN } from './fireworks.ts'

export class Particle extends Mover2D {
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

  run() {
    this.update()
    this.lifespan--

    this.render()
  }

  isDead() {
    return this.lifespan <= 0 || this.isOffScreen()
  }

  private render() {
    point(this.position, {
      size: 4,
      color: this.color,
      opacity: map(this.lifespan, PARTICLE_LIFESPAN, 0, 1, 0, true),
    })
  }

  private isOffScreen() {
    return (
      this.position.y < -this.height / 2 ||
      this.position.x < -this.width / 2 ||
      this.position.x > this.width / 2
    )
  }
}
