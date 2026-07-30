import { Vector3d } from '../vector_3d.ts'
import { ZERO_VECTOR } from '../constants.ts'

export abstract class Mover3D {
  constructor(
    public mass: number,
    public position: Vector3d,
    public velocity: Vector3d,
    public acceleration: Vector3d = ZERO_VECTOR.clone(),
  ) {}

  // [/doc_img/mover_3d.ts/2026-07-30-11-19-15.png]
  update(dt = 1) {
    this.velocity.add(this.acceleration.clone().mult(dt))
    this.position.add(this.velocity.clone().mult(dt))

    this.acceleration.mult(0)
  }

  // F = m * a  => a = F / m
  applyForce(force: Vector3d) {
    this.addAcceleration(force.clone().div(this.mass))
  }

  addAcceleration(acceleration: Vector3d) {
    this.acceleration.add(acceleration)
  }
}
