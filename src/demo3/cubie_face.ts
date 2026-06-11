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
import { AXES, AXES_NAMES } from '../constants.ts'

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

  isFacingOutside() {
    return AXES_NAMES.some(
      axis => this.normal.equals(AXES[axis]) && this.cubie.isInAxisEdge[axis],
    )
  }

  isFacingInside() {
    return !this.isFacingOutside()
  }

  render({ renderVisibleFacesOnly = false } = {}) {
    if (
      (this.cubie.cubieSpacing === 0 || renderVisibleFacesOnly) &&
      this.isFacingInside()
    )
      return // Skip rendering in this case.

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

        square2d(this.size, {
          color: this.color,
          isDoubleSided: renderVisibleFacesOnly,
        })
      })
    })
  }
}
