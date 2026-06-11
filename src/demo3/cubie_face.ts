import {
  isolateTransformations,
  rotateX,
  rotateY,
  square2d,
  translate,
} from './../primitives.ts'
import { Vector3d } from '../vector_3d.ts'
import { abs, PI, sign, HALF_PI } from '../math_utils.ts'
import { Cubie } from './cubie.ts'
import { AXES, AXES_NAMES } from '../constants.ts'
import { demo3Form } from './main.ts'

export class CubieFace {
  isExternal: boolean

  constructor(
    public cubie: Cubie,
    public color: string,
    public normal: Vector3d,
  ) {
    this.isExternal =
      this.cubie.isExternal &&
      AXES_NAMES.some(
        axis => this.normal.equals(AXES[axis]) && this.cubie.isInAxisEdge[axis],
      )
  }

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

  get isInternal() {
    return !this.isExternal
  }

  render() {
    if (!demo3Form.toggles) return

    const { renderExternalFacesOnly } = demo3Form.toggles

    if (
      (this.cubie.cubieSpacing === 0 || renderExternalFacesOnly.getValue()) &&
      this.isInternal
    )
      return // Skip rendering in this case.

    isolateTransformations(() => {
      translate(this.center)

      isolateTransformations(() => {
        if (abs(this.normal.x) === 1) {
          rotateY(sign(this.normal.x) * HALF_PI)
        } else if (abs(this.normal.y) === 1) {
          rotateX(-sign(this.normal.y) * HALF_PI)
        } else if (this.normal.z === -1) {
          rotateX(PI)
        }

        square2d(this.size, {
          color: this.color,
          isDoubleSided:
            renderExternalFacesOnly.getValue() && this.cubie.cubieSpacing > 0,
        })
      })
    })
  }
}
