import { SCREEN_Z_DISTANCE } from './../constants'
import { timesForEach } from './../utils'
import { transform } from './../primitives'
import { $v, Vector } from './../vector'
import { CubieFace } from './cubie_face.ts'
import { CUBIE_SPACING, FACE_COLORS, FACE_NORMALS } from './constants.ts'
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
    this.faces = []

    timesForEach(6, i => {
      const face = new CubieFace(this, FACE_COLORS[i], FACE_NORMALS[i])

      this.faces.push(face)
    })
  }

  get size() {
    return this.cube.cubieSize
  }

  get center() {
    return this.position.mult(this.size + CUBIE_SPACING, false)
  }

  get distanceFromCamera() {
    return transform(this.center).z + SCREEN_Z_DISTANCE
  }

  render() {
    this.faces.forEach(face => face.render())
  }
}
