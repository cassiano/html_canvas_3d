import { ORIGIN } from './constants'
import { Cubie } from './cubie'
import {
  isolateTransformations,
  planeXY,
  planeXZ,
  planeYZ,
  translate,
} from './primitives'
import { Coord3D } from './rubik_cube'
import { abs } from './utils'
import { createVector, Vector } from './vector'

export class CubieFace {
  normal: Vector

  constructor(
    public cubie: Cubie,
    public color: string,
    normal: Coord3D,
  ) {
    this.normal = createVector(...normal)
  }

  get size() {
    return this.cubie.size
  }

  render() {
    isolateTransformations(() => {
      // Move to the face's center.
      translate(this.normal.clone().mult(this.size / 2))

      if (abs(this.normal.x) === 1)
        planeYZ(ORIGIN, this.size, this.size, {
          color: this.color,
          lineWidth: 2,
        })
      else if (abs(this.normal.y) === 1)
        planeXZ(ORIGIN, this.size, this.size, {
          color: this.color,
          lineWidth: 2,
        })
      else if (abs(this.normal.z) === 1)
        planeXY(ORIGIN, this.size, this.size, {
          color: this.color,
          lineWidth: 2,
        })
    })
  }
}
