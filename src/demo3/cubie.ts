import { timesMap } from './../utils'
import { isolateTransformations, translate } from './../primitives'
import { $v, Vector } from './../vector'
import { CubieFace } from './cubie_face.ts'
import {
  CUBIE_SPACING,
  FACE_COLORS,
  FACE_NORMALS,
  FACES_PER_CUBIE,
} from './constants.ts'
import { RubikCube } from './rubik_cube.ts'

export class Cubie {
  position: Vector
  faces: CubieFace[]

  constructor(
    public cube: RubikCube,
    x: number,
    y: number,
    z: number,
  ) {
    this.position = $v(x, y, z)

    this.faces = timesMap(
      FACES_PER_CUBIE,
      i => new CubieFace(this, FACE_COLORS[i], FACE_NORMALS[i]),
    )
  }

  get size() {
    return this.cube.cubieSize
  }

  get center() {
    return this.position.mult(this.size + CUBIE_SPACING, false)
  }

  render() {
    isolateTransformations(() => {
      translate(this.center)

      // rotateX(
      //   ((this.position.x + this.position.y + this.position.z) * millis()) /
      //     3000,
      // )
      // rotateY(
      //   ((this.position.x - this.position.y + this.position.z) * millis()) /
      //     3000,
      // )
      // rotateZ(
      //   ((this.position.x + this.position.y - this.position.z) * millis()) /
      //     3000,
      // )

      this.faces.forEach(face => face.render())
    })
  }
}
