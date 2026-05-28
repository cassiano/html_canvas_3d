import { timesMap } from './../utils.ts'
import { isolateTransformations, translate } from './../primitives.ts'
import { $v, Vector3d } from '../vector_3d.ts'
import { CubieFace } from './cubie_face.ts'
import {
  CUBIE_SPACING,
  FACE_COLORS,
  FACE_NORMALS,
  FACES_PER_CUBIE,
} from './constants.ts'
import { RubikCube } from './rubik_cube.ts'
import { rotateX, rotateY, rotateZ } from '../primitives.ts'
import { millis } from '../utils.ts'
import { ROTATE_CUBIE_FACES } from './constants.ts'

export class Cubie {
  position: Vector3d
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
    return this.position.clone().mult(this.size + CUBIE_SPACING)
  }

  render() {
    isolateTransformations(() => {
      translate(this.center)

      if (ROTATE_CUBIE_FACES) {
        rotateX(
          ((this.position.x + this.position.y + this.position.z) * millis()) /
            5000,
        )
        rotateY(
          ((this.position.x - this.position.y + this.position.z) * millis()) /
            5000,
        )
        rotateZ(
          ((this.position.x + this.position.y - this.position.z) * millis()) /
            5000,
        )
      }

      this.faces.forEach(face => face.render())
    })
  }
}
