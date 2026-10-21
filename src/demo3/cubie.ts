import { timesMap } from './../utils.ts'
import { isolateTransformations, translate } from './../primitives.ts'
import { $v, Vector3d } from '../vector_3d.ts'
import { CubieFace } from './cubie_face.ts'
import { FACE_COLORS, FACE_NORMALS, FACES_PER_CUBIE } from './constants.ts'
import { RubikCube } from './rubik_cube.ts'
import { rotateX, rotateY, rotateZ } from '../primitives.ts'
import { millis } from '../utils.ts'
import { AXES_NAMES, AxesNamesType } from '../constants.ts'
import {
  cubieSpacing,
  renderExternalFacesOnly,
  rotateCubies,
} from './demo3_form.ts'

/**
 * A single cubie of a {@link RubikCube}.
 *
 * A cubie knows its place inside the cube, the ends of the axes it touches,
 * and the six faces it is made of.
 */
export class Cubie {
  /**
   * The position of the cubie inside the cube, in cubie units and relative
   * to the cube's center.
   */
  position: Vector3d
  /**
   * Whether the cubie touches at least one of the cube's outer surfaces.
   */
  isExternal: boolean
  /**
   * The cubie's faces, one for each direction of the cube.
   */
  faces: CubieFace[]

  /**
   * Creates a cubie.
   *
   * @param cube - The cube the cubie belongs to.
   * @param x - The position of the cubie on the X-axis, in cubie units.
   * @param y - The position of the cubie on the Y-axis, in cubie units.
   * @param z - The position of the cubie on the Z-axis, in cubie units.
   * @param isLocatedInAxisEndpoint - Tells, for each axis direction, whether
   *   the cubie sits at that end of the axis.
   */
  constructor(
    /** The cube the cubie belongs to. */
    public cube: RubikCube,
    x: number,
    y: number,
    z: number,
    /** Whether the cubie sits at the end of each axis direction. */
    public isLocatedInAxisEndpoint: Record<AxesNamesType, boolean>,
  ) {
    this.position = $v(x, y, z)

    this.isExternal = AXES_NAMES.some(
      axis => this.isLocatedInAxisEndpoint[axis],
    )

    this.faces = timesMap(
      FACES_PER_CUBIE,
      i => new CubieFace(this, FACE_COLORS[i], FACE_NORMALS[i]),
    )
  }

  /**
   * The edge length of the cubie, in pixels.
   *
   * @returns The size shared by every cubie of the cube.
   */
  get size() {
    return this.cube.cubieSize
  }

  /**
   * The world-space position of the cubie's center.
   *
   * @returns The position of the cubie's center in the scene.
   * @throws {Error} With the message `demo3Form.sliders should contain a value`
   *   when the demo's sliders have not been created yet.
   */
  get center() {
    return this.position.clone().mult(this.size + cubieSpacing())
  }

  /**
   * Whether the cubie is completely surrounded by other cubies.
   *
   * @returns `true` when the cubie does not touch any outer surface.
   */
  get isInternal() {
    return !this.isExternal
  }

  /**
   * Draws the cubie and its faces.
   *
   * Internal cubies are skipped whenever the cubies have no spacing between
   * them or whenever only the outer faces are being rendered.
   *
   * @returns Nothing; the cubie's faces are queued for rendering.
   * @throws {Error} With the message `demo3Form.sliders should contain a value`
   *   when the demo's sliders have not been created yet.
   * @throws {Error} With the message `demo3Form.toggles should contain a value`
   *   when the demo's toggles have not been created yet.
   */
  render() {
    if ((cubieSpacing() === 0 || renderExternalFacesOnly()) && this.isInternal)
      return // Skip rendering in this case.

    isolateTransformations(() => {
      translate(this.center)

      if (rotateCubies()) {
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
