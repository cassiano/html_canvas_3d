import { $v, Vector3d } from './vector_3d.ts'

/**
 * The names of the six axis directions used throughout the project.
 */
export const AXES_NAMES = ['x', 'y', 'z', '-x', '-y', '-z'] as const

/**
 * The name of a single axis direction.
 */
export type AxesNamesType = (typeof AXES_NAMES)[number]

// Canonical unit vectors (+ and -).
/**
 * The canonical unit vectors pointing along each axis direction.
 */
export const AXES: Record<AxesNamesType, Vector3d> = {
  x: $v(1, 0, 0),
  y: $v(0, 1, 0),
  z: $v(0, 0, 1),
  ['-x']: $v(-1, 0, 0),
  ['-y']: $v(0, -1, 0),
  ['-z']: $v(0, 0, -1),
}

/** The target frame rate used by the demos. */
export const FPS = 120

/** How many frames pass between two consecutive FPS log entries. */
export const FPS_LOGGING_FRAME_PERIOD = 30

/** The focal length used by the projection, in pixels. */
export const FOCAL_LENGTH = 400

/** How many frames are used to compute the current FPS reading. */
export const FPS_WINDOW = 100

/** The maximum world-space size of a single line segment before it is split. */
export const MAX_LINE_SEGMENT_SIZE = 20

/** The default number of segments used to approximate a circle. */
export const DEFAULT_CIRCLE_SEGMENTS = 72

/** The default number of segments used to approximate an arrow head. */
export const DEFAULT_ARROW_CIRCLE_SEGMENTS = 10

/** The default number of latitude and longitude lines used to draw a sphere. */
export const DEFAULT_SPHERE_LINES = { longitude: 72, latitude: 36 }

/** The default number of slices used to approximate an elbow. */
export const DEFAULT_ELBOW_CIRCLE_SLICES = 16

/** The tolerance used when comparing depths while ordering the scene. */
export const Z_EPSILON = 1e-10

/** The point at the origin of the coordinate system. */
export const ORIGIN = $v(0, 0, 0)

/** Synonym for {@link ORIGIN}. */
export const NULL_VECTOR = ORIGIN

/** Synonym for {@link ORIGIN}. */
export const ZERO_VECTOR = ORIGIN

/** The visual configuration used when surface normals are displayed. */
export const NORMAL_CONFIG = {
  length: 15,
  color: 'black',
  tip: { radius: 2, height: 5, circleSegments: 3 },
}
