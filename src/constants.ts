import { Coord3D } from './rubik_cube'
import { $v } from './vector'

export const GRAVITY = 0.05
export const DEPTH = 2000
export const SCREEN_Z_DISTANCE = 400
export const FRAME_WINDOW = 100
export const CIRCLE_SEGMENTS = 36
export const SPHERE_LONGITUDE_LINES = 16
export const SPHERE_LATITUDE_LINES = 16
export const ORIGIN = $v(0, 0, 0)

export const CUBIE_SIZE = 90
export const CUBIE_SPACING = 50
export const CUBIES_PER_AXIS = 3

export const FACES: Record<string, number> = {
  front: 0,
  right: 1,
  back: 2,
  left: 3,
  top: 4,
  bottom: 5,
}
export const FACE_COLORS: Record<number, string> = {
  [FACES.front]: 'green',
  [FACES.right]: 'red',
  [FACES.back]: 'blue',
  [FACES.left]: 'orange',
  [FACES.top]: 'white',
  [FACES.bottom]: 'yellow',
}
export const FACE_NORMALS: Record<number, Coord3D> = {
  [FACES.front]: [0, 0, 1], // Normal unit vector towards +z
  [FACES.right]: [1, 0, 0], // Normal unit vector towards +x
  [FACES.back]: [0, 0, -1], // Normal unit vector towards -z
  [FACES.left]: [-1, 0, 0], // Normal unit vector towards -x
  [FACES.top]: [0, 1, 0], // Normal unit vector towards +y
  [FACES.bottom]: [0, -1, 0], // Normal unit vector towards -y
}
