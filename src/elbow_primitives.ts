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

export type ElbowShapeOptions = CircularShapeOptions & {
  elbowCircleSlices?: number
}

// Top -> Right
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
    // [/doc_img/elbow_primitives.ts/2026-07-19-15-56-37.png]
    isolateTransformations(() => {
      translate(radius / 2, 0, 0)
      rotateZ(-theta)
      translate(-radius / 2, 0, 0)
      rotateX(-HALF_PI)

      sphericalCheeseSlice(radius / 2, ringDepth, options)
    })
  }
}

const elbowFromTopToRight = (
  radius: number,
  options: ElbowShapeOptions = {},
  includeTranslation = false,
) => {
  defaultElbow(radius, options)

  if (includeTranslation) translate(radius / 2, radius / 2, 0)
}

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
