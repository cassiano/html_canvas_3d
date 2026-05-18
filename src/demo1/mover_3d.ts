import { $v, Vector } from '../vector'

export class Mover3D {
  position: Vector
  velocity: Vector
  acceleration: Vector

  constructor(
    public mass: number,
    x: number,
    y: number,
    z: number,
  ) {
    this.position = $v(x, y, z)
    this.velocity = $v(0, 0, 0)
    this.acceleration = $v(0, 0, 0)
  }

  update(depth: number) {
    this.position.add(this.velocity)

    if (!this.touchedBottom(depth)) this.velocity.add(this.acceleration)

    this.acceleration.mult(0)
  }

  // F = m x a  => a = F / m
  applyForce(force: Vector) {
    this.addAcceleration(force.clone().div(this.mass))
  }

  addAcceleration(acceleration: Vector) {
    this.acceleration.add(acceleration)
  }

  render({
    xAngle,
    yAngle,
    zAngle,
  }: { xAngle?: number; yAngle?: number; zAngle?: number } = {}) {
    throw new Error('Not implemented')
  }

  distanceFromCenterToBorder(): number {
    throw new Error('Not implemented')
  }

  touchedBottom(depth: number) {
    return -this.position.y + this.distanceFromCenterToBorder() > depth
  }

  checkEdges(depth: number) {
    if (this.touchedBottom(depth)) this.velocity.y *= -1
  }
}
