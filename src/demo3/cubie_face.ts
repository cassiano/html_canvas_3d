import { SCREEN_Z_DISTANCE } from './../constants'
import {
  isolateTransformations,
  planeXY,
  planeXZ,
  planeYZ,
  transform,
  translate,
} from './../primitives'
import { $v, Vector } from './../vector'
import { abs } from './../math_utils'
import { Cubie } from './cubie'
import { Coord3D } from './constants.ts'

export class CubieFace {
  normal: Vector

  constructor(
    public cubie: Cubie,
    public color: string,
    normal: Coord3D,
  ) {
    this.normal = $v(...normal)
  }

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
      // Move to the face's center.
      translate(this.center)

      if (abs(this.normal.x) === 1)
        planeYZ(this.size, this.size, {
          color: this.color,
          lineWidth: 2,
          opacity: 1,
        })
      else if (abs(this.normal.y) === 1)
        planeXZ(this.size, this.size, {
          color: this.color,
          lineWidth: 2,
          opacity: 1,
        })
      else if (abs(this.normal.z) === 1)
        planeXY(this.size, this.size, {
          color: this.color,
          lineWidth: 2,
          opacity: 1,
        })
    })
  }
}
