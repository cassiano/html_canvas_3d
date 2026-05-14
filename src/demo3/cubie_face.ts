import { box, isolateTransformations, translate } from './../primitives'
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

  // Relative to its cubie (container).
  get center() {
    return this.normal.mult(this.size / 2, false)
  }

  get absoluteCenter() {
    return this.cubie.center.add(this.center, false)
  }

  render() {
    isolateTransformations(() => {
      translate(this.center)

      box(
        abs(this.normal.x) === 1 ? 0 : this.size,
        abs(this.normal.y) === 1 ? 0 : this.size,
        abs(this.normal.z) === 1 ? 0 : this.size,
        { color: this.color },
      )
    })
  }
}
