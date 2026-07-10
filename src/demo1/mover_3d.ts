import { $v, Vector3d } from '../vector_3d.ts'
import { ZERO_VECTOR } from '../constants.ts'

export abstract class Mover3D {
  position: Vector3d
  velocity: Vector3d
  acceleration: Vector3d

  constructor(
    public mass: number,
    x: number,
    y: number,
    z: number,
  ) {
    this.position = $v(x, y, z)
    this.velocity = ZERO_VECTOR.clone()
    this.acceleration = ZERO_VECTOR.clone()
  }

  update(height: number) {
    this.position.add(this.velocity)

    if (!this.touchedBottom(height)) this.velocity.add(this.acceleration)

    this.acceleration.mult(0)
  }

  // F = m x a  => a = F / m
  applyForce(force: Vector3d) {
    this.addAcceleration(force.clone().div(this.mass))
  }

  addAcceleration(acceleration: Vector3d) {
    this.acceleration.add(acceleration)
  }

  abstract render(): void

  abstract distanceFromCenterToBorder(): number

  touchedBottom(height: number) {
    return -this.position.y + this.distanceFromCenterToBorder() > height
  }

  checkEdges(height: number) {
    if (this.touchedBottom(height)) this.velocity.y *= -1
  }
}
