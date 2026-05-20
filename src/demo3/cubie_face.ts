import {
  isolateTransformations,
  rotateX,
  rotateY,
  square2d,
  translate,
} from './../primitives'
import { Vector } from './../vector'
import { abs, PI, sign } from './../math_utils'
import { Cubie } from './cubie'

export class CubieFace {
  constructor(
    public cubie: Cubie,
    public color: string,
    public normal: Vector,
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
    // if (!this.cubie.position.equals(3, 3, 3)) return

    isolateTransformations(() => {
      translate(this.center)

      isolateTransformations(() => {
        if (abs(this.normal.x) === 1) {
          rotateY((-sign(this.normal.x) * PI) / 2)
        } else if (abs(this.normal.y) === 1) {
          rotateX((-sign(this.normal.y) * PI) / 2)
        } else if (this.normal.z === -1) {
          rotateX(-PI)
        }

        square2d(this.size, { color: this.color })
      })

      // Render the normal.
      // const normalLength = max(MIN_NORMAL_LENGTH, this.size / 5)
      // const scaledNormal = this.normal.clone().mult(normalLength)
      // line(ORIGIN, scaledNormal, { color: 'black' })
      // point(scaledNormal, { color: 'black', size: normalLength / 10 })
    })
  }
}
