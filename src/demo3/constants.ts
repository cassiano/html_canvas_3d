import { Tuple } from '../utility_types'

export type Coord3D = Tuple<number, 3>

export const CUBIE_SIZE = 25
export const CUBIE_SPACING = 25
export const CUBIES_PER_AXIS = 7

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

export const FACE_NORMALS: Record<number, Coord3D> = {
  [FACES.front]: [0, 0, 1], // Normal unit vector towards +z
  [FACES.right]: [1, 0, 0], // Normal unit vector towards +x
  [FACES.back]: [0, 0, -1], // Normal unit vector towards -z
  [FACES.left]: [-1, 0, 0], // Normal unit vector towards -x
  [FACES.top]: [0, 1, 0], // Normal unit vector towards +y
  [FACES.bottom]: [0, -1, 0], // Normal unit vector towards -y
} as const
