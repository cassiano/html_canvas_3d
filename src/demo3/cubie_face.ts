import { SCREEN_Z_DISTANCE } from './../constants'
import {
  box,
  isolateTransformations,
  transform,
  translate,
} from './../primitives'
import { Vector } from './../vector'
import { abs } from './../math_utils'
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

  get center() {
    return this.cubie.center.add(this.normal.mult(this.size / 2, false), false)
  }

  get distanceFromCamera() {
    return transform(this.center).z + SCREEN_Z_DISTANCE
  }

  render() {
    isolateTransformations(() => {
      translate(this.center)

      box(
        abs(this.normal.x) === 1 ? 0 : this.size,
        abs(this.normal.y) === 1 ? 0 : this.size,
        abs(this.normal.z) === 1 ? 0 : this.size,
        { color: this.color, opacity: 1 },
      )
    })
  }
}
