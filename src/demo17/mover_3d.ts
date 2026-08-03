import { Vector3d } from '../vector_3d.ts'
import { ZERO_VECTOR } from '../constants.ts'

export abstract class Mover3D {
  acceleration: Vector3d

  constructor(
    public mass: number,
    public position: Vector3d,
    public velocity: Vector3d,
  ) {
    this.acceleration = ZERO_VECTOR.clone()
  }

  update() {
    this.position.add(this.velocity)
    this.velocity.add(this.acceleration)

    this.acceleration.mult(0)
  }

  // F = m . a  => a = F / m
  applyForce(force: Vector3d) {
    this.addAcceleration(force.clone().div(this.mass))
  }

  addAcceleration(acceleration: Vector3d) {
    this.acceleration.add(acceleration)
  }
}
