import { point } from '../primitives.ts'
import { Vector3d } from '../vector_3d.ts'
import { Mover3D } from './mover_3d.ts'
import { map } from '../math_utils.ts'
import { PARTICLE_LIFESPAN } from './fireworks.ts'

export class Particle extends Mover3D {
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
      size: map(this.lifespan, PARTICLE_LIFESPAN, 0, 5, 0, true),
      color: this.color,
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
