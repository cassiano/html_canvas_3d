import {
  cube,
  isolateTransformations,
  rotateX,
  rotateY,
  rotateZ,
  sphere,
  translate,
} from '../primitives'
import { Mover3D } from './mover_3d'

export class CubeSphereMover extends Mover3D {
  constructor(
    mass: number,
    x: number,
    y: number,
    z: number,
    public radius: number,
  ) {
    super(mass, x, y, z)
  }

  distanceFromCenterToBorder() {
    return this.radius
  }

  render({
    xAngle,
    yAngle,
    zAngle,
  }: { xAngle?: number; yAngle?: number; zAngle?: number } = {}) {
    isolateTransformations(() => {
      translate(this.position)

      if (xAngle !== undefined) rotateX(xAngle)
      if (yAngle !== undefined) rotateY(yAngle)
      if (zAngle !== undefined) rotateZ(zAngle)

      sphere(this.radius, { color: 'black', lineWidth: 1 })
      cube(this.radius * 2 * 0.7, {
        color: 'black',
        lineWidth: 2,
        opacity: 0.15,
      })
    })
  }
}
