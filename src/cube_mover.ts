import { ORIGIN } from './constants'
import { Mover3D } from './mover_3d'
import {
  cube,
  isolateTransformations,
  rotateX,
  rotateY,
  rotateZ,
  translate,
} from './primitives'

export class CubeMover extends Mover3D {
  constructor(
    mass: number,
    x: number,
    y: number,
    z: number,
    public size: number,
  ) {
    super(mass, x, y, z)
  }

  distanceFromCenterToBorder() {
    return this.size / 2
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

      cube(ORIGIN, this.size, { color: 'orange' })
    })
  }
}
