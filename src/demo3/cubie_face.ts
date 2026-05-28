import {
  isolateTransformations,
  rotateX,
  rotateY,
  square2d,
  translate,
} from './../primitives.ts'
import { Vector3d } from '../vector_3d.ts'
import { abs, PI, sign } from '../math_utils.ts'
import { Cubie } from './cubie.ts'

export class CubieFace {
  constructor(
    public cubie: Cubie,
    public color: string,
    public normal: Vector3d,
  ) {}

  get size() {
    return this.cubie.size
  }

  // Relative center (to its cubie's center).
  get center() {
    return this.normal.clone().mult(this.size / 2)
  }

  get absoluteCenter() {
    return this.cubie.center.clone().add(this.center)
  }

  render() {
    isolateTransformations(() => {
      translate(this.center)

      isolateTransformations(() => {
        if (abs(this.normal.x) === 1) {
          rotateY((sign(this.normal.x) * PI) / 2)
        } else if (abs(this.normal.y) === 1) {
          rotateX((-sign(this.normal.y) * PI) / 2)
        } else if (this.normal.z === -1) {
          rotateX(PI)
        }

        square2d(this.size, { color: this.color })
      })
    })
  }
}
