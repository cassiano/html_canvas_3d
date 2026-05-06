import { ORIGIN } from './constants'
import { Mover3D } from './mover_3d'
import {
  cube,
  isolateTransformations,
  rotateX,
  rotateY,
  rotateZ,
  sphere,
  translate,
} from './primitives'

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

      sphere(ORIGIN, this.radius, { color: 'rgb(161, 12, 12)', width: 1 })
      cube(ORIGIN, this.radius * 2 * 0.7, { color: 'black', width: 2 })
    })
  }
}
