import { ORIGIN } from './constants'
import { Cubie } from './cubie'
import { box, isolateTransformations, translate } from './primitives'
import { Coord3D } from './rubik_cube'
import { abs } from './util'
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

      box(
        ORIGIN,
        abs(this.normal.x) === 1 ? 0 : this.size,
        abs(this.normal.y) === 1 ? 0 : this.size,
        abs(this.normal.z) === 1 ? 0 : this.size,
        { color: this.color, width: 2 },
      )
    })
  }
}
