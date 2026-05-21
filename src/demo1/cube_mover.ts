import {
  cube,
  isolateTransformations,
  rotateX,
  rotateY,
  rotateZ,
  translate,
} from '../primitives.ts'
import { Mover3D } from './mover_3d.ts'
import { millis } from '../utils.ts'

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

  render() {
    isolateTransformations(() => {
      translate(this.position)

      rotateX(millis() / 1000)
      rotateY(millis() / 2000)
      rotateZ(millis() / 3000)

      cube(this.size, { color: 'orange' })
    })
  }
}
