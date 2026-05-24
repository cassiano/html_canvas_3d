import { $v } from './vector_3d.ts'

export const FPS = 120
export const FOCAL_LENGTH = 400
export const FPS_WINDOW = 100
export const LINE_SEGMENTS = 20
export const CIRCLE_SEGMENTS = 72
export const SPHERE_LONGITUDE_LINES = 36
export const SPHERE_LATITUDE_LINES = 36
export const ORIGIN = $v(0, 0, 0)
export const Z_EPSILON = 1e-10

export const NORMAL = {
  length: 20,
  color: 'black',
  tip: { radius: 2, height: 5 },
}
