import { Tuple } from '../utility_types.ts'
import { AXES, Vector3d } from '../vector_3d.ts'

export type Coord3D = Tuple<number, 3>

export const FACES_PER_CUBIE = 6

export const CUBIE_SIZE = 25
export const CUBIE_SPACING = 25
export const CUBIES_PER_AXIS = 7
export const ROTATE_CUBIE_FACES = false

export const FACES: Record<string, number> = {
  front: 0,
  right: 1,
  back: 2,
  left: 3,
  top: 4,
  bottom: 5,
} as const

export const FACE_COLORS: Record<number, string> = {
  [FACES.front]: 'green',
  [FACES.right]: 'red',
  [FACES.back]: 'blue',
  [FACES.left]: 'orange',
  [FACES.top]: 'white',
  [FACES.bottom]: 'yellow',
} as const

export const FACE_NORMALS: Record<number, Vector3d> = {
  [FACES.front]: AXES.z, // Normal unit vector towards +z
  [FACES.right]: AXES.x, // Normal unit vector towards +x
  [FACES.back]: AXES['-z'], // Normal unit vector towards -z
  [FACES.left]: AXES['-x'], // Normal unit vector towards -x
  [FACES.top]: AXES.y, // Normal unit vector towards +y
  [FACES.bottom]: AXES['-y'], // Normal unit vector towards -y
} as const
