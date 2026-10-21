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
import { cubieSpacing, renderExternalFacesOnly } from './demo3_form.ts'

/**
 * One of the six faces of a {@link Cubie}.
 *
 * A face knows the cubie it belongs to, the color it is painted with and the
 * direction it points to.
 */
export class CubieFace {
  /**
   * Whether the face lies on one of the cube's outer surfaces.
   */
  isExternal: boolean

  /**
   * Creates a face.
   *
   * @param cubie - The cubie the face belongs to.
   * @param color - The CSS color used to paint the face.
   * @param normal - The unit vector pointing outwards from the face.
   */
  constructor(
    /** The cubie the face belongs to. */
    public cubie: Cubie,
    /** The CSS color used to paint the face. */
    public color: string,
    /** The unit vector pointing outwards from the face. */
    public normal: Vector3d,
  ) {
    this.isExternal =
      this.cubie.isExternal &&
      AXES_NAMES.some(
        axis =>
          this.normal.equals(AXES[axis]) &&
          this.cubie.isLocatedInAxisEndpoint[axis],
      )
  }

  /**
   * The edge length of the face, in pixels.
   *
   * @returns The size of the cubie the face belongs to.
   */
  get size() {
    return this.cubie.size
  }

  // Relative center (to its cubie's center).
  /**
   * The offset of the face's center relative to its cubie's center.
   *
   * @returns The face's center, in the cubie's local coordinates.
   */
  get center() {
    return this.normal.clone().mult(this.size / 2)
  }

  /**
   * The world-space position of the face's center.
   *
   * @returns The face's center in the scene.
   * @throws {Error} With the message `demo3Form.sliders should contain a value`
   *   when the demo's sliders have not been created yet.
   */
  get absoluteCenter() {
    return this.cubie.center.clone().add(this.center)
  }

  /**
   * Whether the face is hidden inside the cube.
   *
   * @returns `true` when the face does not lie on an outer surface.
   */
  get isInternal() {
    return !this.isExternal
  }

  /**
   * Draws the face as a square.
   *
   * Internal faces are skipped whenever the cubies have no spacing between
   * them or whenever only the outer faces are being rendered.
   *
   * @returns Nothing; the square is queued for rendering.
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
          isDoubleSided: renderExternalFacesOnly() && cubieSpacing() > 0,
        })
      })
    })
  }
}
