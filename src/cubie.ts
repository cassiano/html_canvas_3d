import { CUBIE_SPACING, FACE_COLORS, FACE_NORMALS } from './constants'
import { CubieFace } from './cubie_face'
import { isolateTransformations, translate } from './primitives'
import { RubikCube } from './rubik_cube'
import { timesForEach } from './utils'
import { createVector, Vector } from './vector'

export class Cubie {
  position: Vector
  faces: CubieFace[]

  constructor(
    public cube: RubikCube,
    x: number,
    y: number,
    z: number,
  ) {
    this.position = createVector(x, y, z)
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

  render() {
    // Sort faces in descending order relative to their distance from the camera.
    const orderedFaces = this.faces.toSorted(
      (left, right) => right.distanceFromCamera - left.distanceFromCamera,
    )

    orderedFaces.forEach(face => {
      isolateTransformations(() => {
        // Move to the cubie's center.
        translate(this.center)

        face.render()
      })
    })
  }
}
