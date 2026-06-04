import { $v } from './vector_3d.ts'

// Canonical unit vectors (+ and -).
export const AXES = {
  x: $v(1, 0, 0),
  y: $v(0, 1, 0),
  z: $v(0, 0, 1),

  ['-x']: $v(-1, 0, 0),
  ['-y']: $v(0, -1, 0),
  ['-z']: $v(0, 0, -1),
}

export const FPS = 120
export const FPS_LOGGING_FRAME_FREQUENCY = 30
export const FOCAL_LENGTH = 400
export const FPS_WINDOW = 100
export const LINE_SEGMENTS = 20
export const CIRCLE_SEGMENTS = 72
export const ARROW_DEFAULT_CIRCLE_SEGMENTS = 10
export const SPHERE_LINES = { longitude: 72, latitude: 36 }
export const ELBOW_CIRCLE_SLICES = 16
export const ORIGIN = $v(0, 0, 0)
export const Z_EPSILON = 1e-10

export const NORMAL_CONFIG = {
  length: 20,
  color: 'black',
  tip: { radius: 2, height: 5, circleSegments: 3 },
}
