import { timesMap } from './../utils.ts'
import { isolateTransformations, translate } from './../primitives.ts'
import { $v, Vector3d } from '../vector_3d.ts'
import { CubieFace } from './cubie_face.ts'
import { FACE_COLORS, FACE_NORMALS, FACES_PER_CUBIE } from './constants.ts'
import { RubikCube } from './rubik_cube.ts'
import { rotateX, rotateY, rotateZ } from '../primitives.ts'
import { millis } from '../utils.ts'
import { AXES_NAMES, AxesNamesType } from '../constants.ts'

export class Cubie {
  position: Vector3d
  faces: CubieFace[]
  isExternal: boolean

  constructor(
    public cube: RubikCube,
    public cubieSpacing: number,
    x: number,
    y: number,
    z: number,
    public isInAxisEdge: Record<AxesNamesType, boolean>,
  ) {
    this.position = $v(x, y, z)
    this.isExternal = AXES_NAMES.some(axis => this.isInAxisEdge[axis])

    this.faces = timesMap(
      FACES_PER_CUBIE,
      i => new CubieFace(this, FACE_COLORS[i], FACE_NORMALS[i]),
    )
  }

  get size() {
    return this.cube.cubieSize
  }

  get center() {
    return this.position.clone().mult(this.size + this.cubieSpacing)
  }

  get isInternal() {
    return !this.isExternal
  }

  render({ rotateCubies = false, renderExternalFacesOnly = false } = {}) {
    if ((this.cubieSpacing === 0 || renderExternalFacesOnly) && this.isInternal)
      return // Skip rendering in this case.

    isolateTransformations(() => {
      translate(this.center)

      if (rotateCubies) {
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

      this.faces.forEach(face => face.render({ renderExternalFacesOnly }))
    })
  }
}
