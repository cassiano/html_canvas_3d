// deno-lint-ignore-file constructor-super

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
import { Vector3d } from '../vector_3d.ts'
import { Mover3D } from './mover_3d.ts'

export class CubeSphereMover extends Mover3D {
  radius: number

  constructor(mass: number, position: Vector3d, radius: number)
  constructor(mass: number, x: number, y: number, z: number, radius: number)
  constructor(
    mass: number,
    xOrPosition: number | Vector3d,
    yOrRadius: number,
    z?: number,
    radius?: number,
  ) {
    if (typeof xOrPosition === 'number') {
      super(mass, xOrPosition, yOrRadius, z!)

      this.radius = radius!
    } else {
      super(mass, xOrPosition)

      this.radius = yOrRadius
    }
  }

  override distanceFromCenterToBorder() {
    return this.radius
  }

  override render() {
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
