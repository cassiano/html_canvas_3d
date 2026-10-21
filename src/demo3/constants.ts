import { Tuple } from '../utility_types.ts'
import { Vector3d } from '../vector_3d.ts'
import { AXES } from '../constants.ts'

/**
 * A point or an offset in 3D space, expressed as its `[x, y, z]`
 * coordinates.
 */
export type Coord3D = Tuple<number, 3>

/**
 * The number of faces every cubie is made of.
 */
export const FACES_PER_CUBIE = 6

/**
 * The number of cubies along each axis of the cube when the demo starts.
 */
export const INITIAL_CUBIES_PER_AXIS = 9
/**
 * The edge length of a single cubie, in pixels, when the demo starts.
 */
export const INITIAL_CUBIE_SIZE = 25
/**
 * The gap between two neighbouring cubies, in pixels, when the demo starts.
 */
export const INITIAL_CUBIE_SPACING = 20

/**
 * The index of each face of a cubie.
 *
 * The indices are the keys used by {@link FACE_COLORS} and
 * {@link FACE_NORMALS}, and they also define the order in which a cubie's
 * faces are created.
 */
export const FACES: Record<string, number> = {
  front: 0,
  right: 1,
  back: 2,
  left: 3,
  top: 4,
  bottom: 5,
} as const

/**
 * The color used to paint each face of a cubie.
 *
 * The colors are keyed by the face indices declared in {@link FACES}.
 */
export const FACE_COLORS: Record<number, string> = {
  [FACES.front]: 'green',
  [FACES.right]: 'red',
  [FACES.back]: 'blue',
  [FACES.left]: 'orange',
  [FACES.top]: 'white',
  [FACES.bottom]: 'yellow',
} as const

/**
 * The outward normal of each face of a cubie.
 *
 * The normals are keyed by the face indices declared in {@link FACES}, and
 * each one points away from the interior of the cube.
 */
export const FACE_NORMALS: Record<number, Vector3d> = {
  [FACES.front]: AXES.z, // Normal unit vector towards +z
  [FACES.right]: AXES.x, // Normal unit vector towards +x
  [FACES.back]: AXES['-z'], // Normal unit vector towards -z
  [FACES.left]: AXES['-x'], // Normal unit vector towards -x
  [FACES.top]: AXES.y, // Normal unit vector towards +y
  [FACES.bottom]: AXES['-y'], // Normal unit vector towards -y
} as const
