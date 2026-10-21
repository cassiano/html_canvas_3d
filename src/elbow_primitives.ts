import { PI, HALF_PI, TWO_PI } from './math_utils.ts'
import { DEFAULT_SHAPE_OPTIONS, sphericalCheeseSlice } from './primitives.ts'
import {
  DEFAULT_CIRCLE_SEGMENTS,
  DEFAULT_ELBOW_CIRCLE_SLICES,
} from './constants.ts'
import {
  isolateTransformations,
  rotateX,
  rotateY,
  translate,
  rotateZ,
  CircularShapeOptions,
} from './primitives.ts'

/**
 * Options accepted by the elbow (curved pipe) primitives.
 *
 * Extends the shared circular-shape options with a control over how many
 * slices are used to approximate the curve of the elbow.
 */
export type ElbowShapeOptions = CircularShapeOptions & {
  /**
   * Number of slices used to approximate the quarter-circle bend of the elbow.
   *
   * Higher values produce a smoother curve at the cost of more draw calls.
   */
  elbowCircleSlices?: number
}

// Top -> Right
/**
 * Draws the canonical "top to right" elbow bend at the current origin.
 *
 * The bend is approximated by a series of slices; every slice is drawn as a
 * hollow spherical slice (a "cheese slice"). The caller is responsible for
 * applying any rotation or translation needed to place the bend.
 *
 * @param radius - Radius of the pipe that forms the elbow, in world units.
 * @param options - Optional rendering overrides; see {@link ElbowShapeOptions}.
 *   `elbowCircleSlices` controls the smoothness of the bend and all other
 *   entries are forwarded to the underlying shape renderer.
 * @returns Nothing; the elbow is queued for rendering as a side effect.
 * @throws {Error} When `options.elbowCircleSlices` is `0` or negative, which
 *   would make the slice stepping non-terminating or invalid.
 */
const defaultElbow = (radius: number, options: ElbowShapeOptions = {}) => {
  const finalOptions = {
    ...DEFAULT_SHAPE_OPTIONS,
    circleSegments: DEFAULT_CIRCLE_SEGMENTS,
    elbowCircleSlices: DEFAULT_ELBOW_CIRCLE_SLICES,
    ...options,
  }
  const { elbowCircleSlices } = finalOptions

  const ringDepth = (TWO_PI * radius) / 4 / elbowCircleSlices // (2.π.R)/4 = 1/4 of circle perimeter.

  for (let theta = 0; theta < HALF_PI; theta += HALF_PI / elbowCircleSlices) {
    // [/doc_img/elbow_primitives.ts/2026-07-20-09-58-58.png]
    isolateTransformations(() => {
      translate(radius / 2, 0, 0)
      rotateZ(-theta)
      translate(-radius / 2, 0, 0)
      rotateX(-HALF_PI)

      sphericalCheeseSlice(radius / 2, ringDepth, options)
    })
  }
}

/**
 * Draws a 90-degree elbow that bends from the +Y axis to the +X axis.
 *
 * @param radius - Radius of the pipe that forms the elbow, in world units.
 * @param options - Optional rendering overrides; see {@link ElbowShapeOptions}.
 * @param includeTranslation - When `true`, the elbow is additionally offset so
 *   that it visually connects the two axes; when `false`, the elbow is drawn
 *   around the current origin without that extra offset.
 * @returns Nothing; the elbow is queued for rendering as a side effect.
 * @throws {Error} When `options.elbowCircleSlices` is `0` or negative.
 */
const elbowFromTopToRight = (
  radius: number,
  options: ElbowShapeOptions = {},
  includeTranslation = false,
) => {
  defaultElbow(radius, options)

  if (includeTranslation) translate(radius / 2, radius / 2, 0)
}

/**
 * Draws a 90-degree elbow that bends from the -Y axis to the +X axis.
 *
 * @param radius - Radius of the pipe that forms the elbow, in world units.
 * @param options - Optional rendering overrides; see {@link ElbowShapeOptions}.
 * @param includeTranslation - When `true`, the elbow is additionally offset so
 *   that it visually connects the two axes; when `false`, the elbow is drawn
 *   around the current origin without that extra offset.
 * @returns Nothing; the elbow is queued for rendering as a side effect.
 * @throws {Error} When `options.elbowCircleSlices` is `0` or negative.
 */
const elbowFromBottomToRight = (
  radius: number,
  options: ElbowShapeOptions = {},
  includeTranslation = false,
) => {
  isolateTransformations(() => {
    rotateX(PI)

    defaultElbow(radius, options)
  })

  if (includeTranslation) translate(radius / 2, -radius / 2, 0)
}

/**
 * Draws a 90-degree elbow that bends from the -Z axis to the +X axis.
 *
 * @param radius - Radius of the pipe that forms the elbow, in world units.
 * @param options - Optional rendering overrides; see {@link ElbowShapeOptions}.
 * @param includeTranslation - When `true`, the elbow is additionally offset so
 *   that it visually connects the two axes; when `false`, the elbow is drawn
 *   around the current origin without that extra offset.
 * @returns Nothing; the elbow is queued for rendering as a side effect.
 * @throws {Error} When `options.elbowCircleSlices` is `0` or negative.
 */
const elbowFromBackToRight = (
  radius: number,
  options: ElbowShapeOptions = {},
  includeTranslation = false,
) => {
  isolateTransformations(() => {
    rotateX(-HALF_PI)

    defaultElbow(radius, options)
  })

  if (includeTranslation) translate(radius / 2, 0, -radius / 2)
}

/**
 * Draws a 90-degree elbow that bends from the +Z axis to the +X axis.
 *
 * @param radius - Radius of the pipe that forms the elbow, in world units.
 * @param options - Optional rendering overrides; see {@link ElbowShapeOptions}.
 * @param includeTranslation - When `true`, the elbow is additionally offset so
 *   that it visually connects the two axes; when `false`, the elbow is drawn
 *   around the current origin without that extra offset.
 * @returns Nothing; the elbow is queued for rendering as a side effect.
 * @throws {Error} When `options.elbowCircleSlices` is `0` or negative.
 */
const elbowFromFrontToRight = (
  radius: number,
  options: ElbowShapeOptions = {},
  includeTranslation = false,
) => {
  isolateTransformations(() => {
    rotateX(HALF_PI)

    defaultElbow(radius, options)
  })

  if (includeTranslation) translate(radius / 2, 0, radius / 2)
}

/**
 * Draws a 90-degree elbow that bends from the +Y axis to the -X axis.
 *
 * @param radius - Radius of the pipe that forms the elbow, in world units.
 * @param options - Optional rendering overrides; see {@link ElbowShapeOptions}.
 * @param includeTranslation - When `true`, the elbow is additionally offset so
 *   that it visually connects the two axes; when `false`, the elbow is drawn
 *   around the current origin without that extra offset.
 * @returns Nothing; the elbow is queued for rendering as a side effect.
 * @throws {Error} When `options.elbowCircleSlices` is `0` or negative.
 */
const elbowFromTopToLeft = (
  radius: number,
  options: ElbowShapeOptions = {},
  includeTranslation = false,
) => {
  isolateTransformations(() => {
    rotateY(PI)

    defaultElbow(radius, options)
  })

  if (includeTranslation) translate(-radius / 2, radius / 2, 0)
}

/**
 * Draws a 90-degree elbow that bends from the -Y axis to the -X axis.
 *
 * @param radius - Radius of the pipe that forms the elbow, in world units.
 * @param options - Optional rendering overrides; see {@link ElbowShapeOptions}.
 * @param includeTranslation - When `true`, the elbow is additionally offset so
 *   that it visually connects the two axes; when `false`, the elbow is drawn
 *   around the current origin without that extra offset.
 * @returns Nothing; the elbow is queued for rendering as a side effect.
 * @throws {Error} When `options.elbowCircleSlices` is `0` or negative.
 */
const elbowFromBottomToLeft = (
  radius: number,
  options: ElbowShapeOptions = {},
  includeTranslation = false,
) => {
  isolateTransformations(() => {
    rotateX(PI)
    rotateY(PI)

    defaultElbow(radius, options)
  })

  if (includeTranslation) translate(-radius / 2, -radius / 2, 0)
}

/**
 * Draws a 90-degree elbow that bends from the -Z axis to the -X axis.
 *
 * @param radius - Radius of the pipe that forms the elbow, in world units.
 * @param options - Optional rendering overrides; see {@link ElbowShapeOptions}.
 * @param includeTranslation - When `true`, the elbow is additionally offset so
 *   that it visually connects the two axes; when `false`, the elbow is drawn
 *   around the current origin without that extra offset.
 * @returns Nothing; the elbow is queued for rendering as a side effect.
 * @throws {Error} When `options.elbowCircleSlices` is `0` or negative.
 */
const elbowFromBackToLeft = (
  radius: number,
  options: ElbowShapeOptions = {},
  includeTranslation = false,
) => {
  isolateTransformations(() => {
    rotateX(HALF_PI)
    rotateZ(PI)

    defaultElbow(radius, options)
  })

  if (includeTranslation) translate(-radius / 2, 0, -radius / 2)
}

/**
 * Draws a 90-degree elbow that bends from the +Z axis to the -X axis.
 *
 * @param radius - Radius of the pipe that forms the elbow, in world units.
 * @param options - Optional rendering overrides; see {@link ElbowShapeOptions}.
 * @param includeTranslation - When `true`, the elbow is additionally offset so
 *   that it visually connects the two axes; when `false`, the elbow is drawn
 *   around the current origin without that extra offset.
 * @returns Nothing; the elbow is queued for rendering as a side effect.
 * @throws {Error} When `options.elbowCircleSlices` is `0` or negative.
 */
const elbowFromFrontToLeft = (
  radius: number,
  options: ElbowShapeOptions = {},
  includeTranslation = false,
) => {
  isolateTransformations(() => {
    rotateX(-HALF_PI)
    rotateZ(PI)

    defaultElbow(radius, options)
  })

  if (includeTranslation) translate(-radius / 2, 0, radius / 2)
}

/**
 * Draws a 90-degree elbow that bends from the -X axis to the +Y axis.
 *
 * @param radius - Radius of the pipe that forms the elbow, in world units.
 * @param options - Optional rendering overrides; see {@link ElbowShapeOptions}.
 * @param includeTranslation - When `true`, the elbow is additionally offset so
 *   that it visually connects the two axes; when `false`, the elbow is drawn
 *   around the current origin without that extra offset.
 * @returns Nothing; the elbow is queued for rendering as a side effect.
 * @throws {Error} When `options.elbowCircleSlices` is `0` or negative.
 */
const elbowFromLeftToTop = (
  radius: number,
  options: ElbowShapeOptions = {},
  includeTranslation = false,
) => {
  isolateTransformations(() => {
    translate(-radius / 2, radius / 2, 0)
    rotateX(PI)

    defaultElbow(radius, options)
  })

  if (includeTranslation) translate(-radius / 2, radius / 2, 0)
}

/**
 * Draws a 90-degree elbow that bends from the +X axis to the +Y axis.
 *
 * @param radius - Radius of the pipe that forms the elbow, in world units.
 * @param options - Optional rendering overrides; see {@link ElbowShapeOptions}.
 * @param includeTranslation - When `true`, the elbow is additionally offset so
 *   that it visually connects the two axes; when `false`, the elbow is drawn
 *   around the current origin without that extra offset.
 * @returns Nothing; the elbow is queued for rendering as a side effect.
 * @throws {Error} When `options.elbowCircleSlices` is `0` or negative.
 */
const elbowFromRightToTop = (
  radius: number,
  options: ElbowShapeOptions = {},
  includeTranslation = false,
) => {
  isolateTransformations(() => {
    translate(radius / 2, radius / 2, 0)
    rotateX(PI)
    rotateY(PI)

    defaultElbow(radius, options)
  })

  if (includeTranslation) translate(radius / 2, radius / 2, 0)
}

/**
 * Draws a 90-degree elbow that bends from the -Z axis to the +Y axis.
 *
 * @param radius - Radius of the pipe that forms the elbow, in world units.
 * @param options - Optional rendering overrides; see {@link ElbowShapeOptions}.
 * @param includeTranslation - When `true`, the elbow is additionally offset so
 *   that it visually connects the two axes; when `false`, the elbow is drawn
 *   around the current origin without that extra offset.
 * @returns Nothing; the elbow is queued for rendering as a side effect.
 * @throws {Error} When `options.elbowCircleSlices` is `0` or negative.
 */
const elbowFromBackToTop = (
  radius: number,
  options: ElbowShapeOptions = {},
  includeTranslation = false,
) => {
  isolateTransformations(() => {
    translate(0, radius / 2, -radius / 2)
    rotateX(PI)
    rotateY(HALF_PI)

    defaultElbow(radius, options)
  })

  if (includeTranslation) translate(0, radius / 2, -radius / 2)
}

/**
 * Draws a 90-degree elbow that bends from the +Z axis to the +Y axis.
 *
 * @param radius - Radius of the pipe that forms the elbow, in world units.
 * @param options - Optional rendering overrides; see {@link ElbowShapeOptions}.
 * @param includeTranslation - When `true`, the elbow is additionally offset so
 *   that it visually connects the two axes; when `false`, the elbow is drawn
 *   around the current origin without that extra offset.
 * @returns Nothing; the elbow is queued for rendering as a side effect.
 * @throws {Error} When `options.elbowCircleSlices` is `0` or negative.
 */
const elbowFromFrontToTop = (
  radius: number,
  options: ElbowShapeOptions = {},
  includeTranslation = false,
) => {
  isolateTransformations(() => {
    translate(0, radius / 2, radius / 2)
    rotateX(PI)
    rotateY(-HALF_PI)

    defaultElbow(radius, options)
  })

  if (includeTranslation) translate(0, radius / 2, radius / 2)
}

/**
 * Draws a 90-degree elbow that bends from the -X axis to the -Y axis.
 *
 * @param radius - Radius of the pipe that forms the elbow, in world units.
 * @param options - Optional rendering overrides; see {@link ElbowShapeOptions}.
 * @param includeTranslation - When `true`, the elbow is additionally offset so
 *   that it visually connects the two axes; when `false`, the elbow is drawn
 *   around the current origin without that extra offset.
 * @returns Nothing; the elbow is queued for rendering as a side effect.
 * @throws {Error} When `options.elbowCircleSlices` is `0` or negative.
 */
const elbowFromLeftToBottom = (
  radius: number,
  options: ElbowShapeOptions = {},
  includeTranslation = false,
) => {
  isolateTransformations(() => {
    translate(-radius / 2, -radius / 2, 0)

    defaultElbow(radius, options)
  })

  if (includeTranslation) translate(-radius / 2, -radius / 2, 0)
}

/**
 * Draws a 90-degree elbow that bends from the +X axis to the -Y axis.
 *
 * @param radius - Radius of the pipe that forms the elbow, in world units.
 * @param options - Optional rendering overrides; see {@link ElbowShapeOptions}.
 * @param includeTranslation - When `true`, the elbow is additionally offset so
 *   that it visually connects the two axes; when `false`, the elbow is drawn
 *   around the current origin without that extra offset.
 * @returns Nothing; the elbow is queued for rendering as a side effect.
 * @throws {Error} When `options.elbowCircleSlices` is `0` or negative.
 */
const elbowFromRightToBottom = (
  radius: number,
  options: ElbowShapeOptions = {},
  includeTranslation = false,
) => {
  isolateTransformations(() => {
    translate(radius / 2, -radius / 2, 0)
    rotateY(PI)

    defaultElbow(radius, options)
  })

  if (includeTranslation) translate(radius / 2, -radius / 2, 0)
}

/**
 * Draws a 90-degree elbow that bends from the -Z axis to the -Y axis.
 *
 * @param radius - Radius of the pipe that forms the elbow, in world units.
 * @param options - Optional rendering overrides; see {@link ElbowShapeOptions}.
 * @param includeTranslation - When `true`, the elbow is additionally offset so
 *   that it visually connects the two axes; when `false`, the elbow is drawn
 *   around the current origin without that extra offset.
 * @returns Nothing; the elbow is queued for rendering as a side effect.
 * @throws {Error} When `options.elbowCircleSlices` is `0` or negative.
 */
const elbowFromBackToBottom = (
  radius: number,
  options: ElbowShapeOptions = {},
  includeTranslation = false,
) => {
  isolateTransformations(() => {
    translate(0, -radius / 2, -radius / 2)
    rotateY(-HALF_PI)

    defaultElbow(radius, options)
  })

  if (includeTranslation) translate(0, -radius / 2, -radius / 2)
}

/**
 * Draws a 90-degree elbow that bends from the +Z axis to the -Y axis.
 *
 * @param radius - Radius of the pipe that forms the elbow, in world units.
 * @param options - Optional rendering overrides; see {@link ElbowShapeOptions}.
 * @param includeTranslation - When `true`, the elbow is additionally offset so
 *   that it visually connects the two axes; when `false`, the elbow is drawn
 *   around the current origin without that extra offset.
 * @returns Nothing; the elbow is queued for rendering as a side effect.
 * @throws {Error} When `options.elbowCircleSlices` is `0` or negative.
 */
const elbowFromFrontToBottom = (
  radius: number,
  options: ElbowShapeOptions = {},
  includeTranslation = false,
) => {
  isolateTransformations(() => {
    translate(0, -radius / 2, radius / 2)
    rotateY(HALF_PI)

    defaultElbow(radius, options)
  })

  if (includeTranslation) translate(0, -radius / 2, radius / 2)
}

/**
 * Draws a 90-degree elbow that bends from the +Y axis to the +Z axis.
 *
 * @param radius - Radius of the pipe that forms the elbow, in world units.
 * @param options - Optional rendering overrides; see {@link ElbowShapeOptions}.
 * @param includeTranslation - When `true`, the elbow is additionally offset so
 *   that it visually connects the two axes; when `false`, the elbow is drawn
 *   around the current origin without that extra offset.
 * @returns Nothing; the elbow is queued for rendering as a side effect.
 * @throws {Error} When `options.elbowCircleSlices` is `0` or negative.
 */
const elbowFromTopToFront = (
  radius: number,
  options: ElbowShapeOptions = {},
  includeTranslation = false,
) => {
  isolateTransformations(() => {
    rotateY(-HALF_PI)

    defaultElbow(radius, options)
  })

  if (includeTranslation) translate(0, radius / 2, radius / 2)
}

/**
 * Draws a 90-degree elbow that bends from the -Y axis to the +Z axis.
 *
 * @param radius - Radius of the pipe that forms the elbow, in world units.
 * @param options - Optional rendering overrides; see {@link ElbowShapeOptions}.
 * @param includeTranslation - When `true`, the elbow is additionally offset so
 *   that it visually connects the two axes; when `false`, the elbow is drawn
 *   around the current origin without that extra offset.
 * @returns Nothing; the elbow is queued for rendering as a side effect.
 * @throws {Error} When `options.elbowCircleSlices` is `0` or negative.
 */
const elbowFromBottomToFront = (
  radius: number,
  options: ElbowShapeOptions = {},
  includeTranslation = false,
) => {
  isolateTransformations(() => {
    translate(0, -radius / 2, radius / 2)
    rotateY(-HALF_PI)
    rotateZ(HALF_PI)

    defaultElbow(radius, options)
  })

  if (includeTranslation) translate(0, -radius / 2, radius / 2)
}

/**
 * Draws a 90-degree elbow that bends from the -X axis to the +Z axis.
 *
 * @param radius - Radius of the pipe that forms the elbow, in world units.
 * @param options - Optional rendering overrides; see {@link ElbowShapeOptions}.
 * @param includeTranslation - When `true`, the elbow is additionally offset so
 *   that it visually connects the two axes; when `false`, the elbow is drawn
 *   around the current origin without that extra offset.
 * @returns Nothing; the elbow is queued for rendering as a side effect.
 * @throws {Error} When `options.elbowCircleSlices` is `0` or negative.
 */
const elbowFromLeftToFront = (
  radius: number,
  options: ElbowShapeOptions = {},
  includeTranslation = false,
) => {
  isolateTransformations(() => {
    translate(-radius / 2, 0, radius / 2)
    rotateX(-HALF_PI)

    defaultElbow(radius, options)
  })

  if (includeTranslation) translate(-radius / 2, 0, radius / 2)
}

/**
 * Draws a 90-degree elbow that bends from the +X axis to the +Z axis.
 *
 * @param radius - Radius of the pipe that forms the elbow, in world units.
 * @param options - Optional rendering overrides; see {@link ElbowShapeOptions}.
 * @param includeTranslation - When `true`, the elbow is additionally offset so
 *   that it visually connects the two axes; when `false`, the elbow is drawn
 *   around the current origin without that extra offset.
 * @returns Nothing; the elbow is queued for rendering as a side effect.
 * @throws {Error} When `options.elbowCircleSlices` is `0` or negative.
 */
const elbowFromRightToFront = (
  radius: number,
  options: ElbowShapeOptions = {},
  includeTranslation = false,
) => {
  isolateTransformations(() => {
    translate(radius / 2, 0, radius / 2)
    rotateX(HALF_PI)
    rotateZ(PI)

    defaultElbow(radius, options)
  })

  if (includeTranslation) translate(radius / 2, 0, radius / 2)
}

/**
 * Draws a 90-degree elbow that bends from the +Y axis to the -Z axis.
 *
 * @param radius - Radius of the pipe that forms the elbow, in world units.
 * @param options - Optional rendering overrides; see {@link ElbowShapeOptions}.
 * @param includeTranslation - When `true`, the elbow is additionally offset so
 *   that it visually connects the two axes; when `false`, the elbow is drawn
 *   around the current origin without that extra offset.
 * @returns Nothing; the elbow is queued for rendering as a side effect.
 * @throws {Error} When `options.elbowCircleSlices` is `0` or negative.
 */
const elbowFromTopToBack = (
  radius: number,
  options: ElbowShapeOptions = {},
  includeTranslation = false,
) => {
  isolateTransformations(() => {
    rotateY(HALF_PI)

    defaultElbow(radius, options)
  })

  if (includeTranslation) translate(0, radius / 2, -radius / 2)
}

/**
 * Draws a 90-degree elbow that bends from the -Y axis to the -Z axis.
 *
 * @param radius - Radius of the pipe that forms the elbow, in world units.
 * @param options - Optional rendering overrides; see {@link ElbowShapeOptions}.
 * @param includeTranslation - When `true`, the elbow is additionally offset so
 *   that it visually connects the two axes; when `false`, the elbow is drawn
 *   around the current origin without that extra offset.
 * @returns Nothing; the elbow is queued for rendering as a side effect.
 * @throws {Error} When `options.elbowCircleSlices` is `0` or negative.
 */
const elbowFromBottomToBack = (
  radius: number,
  options: ElbowShapeOptions = {},
  includeTranslation = false,
) => {
  isolateTransformations(() => {
    rotateY(HALF_PI)
    rotateX(PI)

    defaultElbow(radius, options)
  })

  if (includeTranslation) translate(0, -radius / 2, -radius / 2)
}

/**
 * Draws a 90-degree elbow that bends from the -X axis to the -Z axis.
 *
 * @param radius - Radius of the pipe that forms the elbow, in world units.
 * @param options - Optional rendering overrides; see {@link ElbowShapeOptions}.
 * @param includeTranslation - When `true`, the elbow is additionally offset so
 *   that it visually connects the two axes; when `false`, the elbow is drawn
 *   around the current origin without that extra offset.
 * @returns Nothing; the elbow is queued for rendering as a side effect.
 * @throws {Error} When `options.elbowCircleSlices` is `0` or negative.
 */
const elbowFromLeftToBack = (
  radius: number,
  options: ElbowShapeOptions = {},
  includeTranslation = false,
) => {
  isolateTransformations(() => {
    translate(-radius / 2, 0, -radius / 2)
    rotateX(HALF_PI)

    defaultElbow(radius, options)
  })

  if (includeTranslation) translate(-radius / 2, 0, -radius / 2)
}

/**
 * Draws a 90-degree elbow that bends from the +X axis to the -Z axis.
 *
 * @param radius - Radius of the pipe that forms the elbow, in world units.
 * @param options - Optional rendering overrides; see {@link ElbowShapeOptions}.
 * @param includeTranslation - When `true`, the elbow is additionally offset so
 *   that it visually connects the two axes; when `false`, the elbow is drawn
 *   around the current origin without that extra offset.
 * @returns Nothing; the elbow is queued for rendering as a side effect.
 * @throws {Error} When `options.elbowCircleSlices` is `0` or negative.
 */
const elbowFromRightToBack = (
  radius: number,
  options: ElbowShapeOptions = {},
  includeTranslation = false,
) => {
  isolateTransformations(() => {
    translate(radius / 2, 0, -radius / 2)
    rotateX(HALF_PI)
    rotateY(PI)

    defaultElbow(radius, options)
  })

  if (includeTranslation) translate(radius / 2, 0, -radius / 2)
}

/**
 * Lookup table of every elbow variant, indexed by the axis it starts from and
 * the axis it bends to.
 *
 * The outer key is the source axis and the inner key is the destination axis.
 * Both use the axis naming convention of {@link AXES_NAMES} (`'x'`, `'y'`,
 * `'z'`, `'-x'`, `'-y'`, `'-z'`).
 *
 * @example
 * ```ts
 * elbow.x.y(20) // Draws an elbow from the +X axis bending towards +Y.
 * ```
 */
export const elbow = {
  x: {
    y: elbowFromRightToTop,
    z: elbowFromRightToFront,

    ['-y']: elbowFromRightToBottom,
    ['-z']: elbowFromRightToBack,
  },

  y: {
    x: elbowFromTopToRight,
    z: elbowFromTopToFront,

    ['-x']: elbowFromTopToLeft,
    ['-z']: elbowFromTopToBack,
  },

  z: {
    x: elbowFromFrontToRight,
    y: elbowFromFrontToTop,

    ['-x']: elbowFromFrontToLeft,
    ['-y']: elbowFromFrontToBottom,
  },

  ['-x']: {
    y: elbowFromLeftToTop,
    z: elbowFromLeftToFront,

    ['-y']: elbowFromLeftToBottom,
    ['-z']: elbowFromLeftToBack,
  },

  ['-y']: {
    x: elbowFromBottomToRight,
    z: elbowFromBottomToFront,

    ['-x']: elbowFromBottomToLeft,
    ['-z']: elbowFromBottomToBack,
  },

  ['-z']: {
    x: elbowFromBackToRight,
    y: elbowFromBackToTop,

    ['-x']: elbowFromBackToLeft,
    ['-y']: elbowFromBackToBottom,
  },
}
