import { $v, Vector3d } from '../vector_3d.ts'

export class Mover3D {
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
    this.velocity = $v(0, 0, 0)
    this.acceleration = $v(0, 0, 0)
  }

  update(depth: number) {
    this.position.add(this.velocity)

    if (!this.touchedBottom(depth)) this.velocity.add(this.acceleration)

    this.acceleration.mult(0)
  }

  // F = m x a  => a = F / m
  applyForce(force: Vector3d) {
    this.addAcceleration(force.clone().div(this.mass))
  }

  addAcceleration(acceleration: Vector3d) {
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
