import {
  cube,
  isolateTransformations,
  rotateX,
  rotateY,
  rotateZ,
  sphere,
  translate,
} from '../primitives.ts'
import { millis } from '../utils.ts'
import { Mover3D } from './mover_3d.ts'

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

  render() {
    isolateTransformations(() => {
      translate(this.position)

      rotateX(millis() / 1000)
      rotateY(millis() / 2000)
      rotateZ(millis() / 3000)

      sphere(this.radius, { color: 'yellow', lineWidth: 1 })
      cube(this.radius * 2 * 1.1, {
        color: 'black',
        lineWidth: 2,
        opacity: 0.15,
      })
    })
  }
}
