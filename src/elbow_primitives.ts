import { PI, HALF_PI, TWO_PI } from './math_utils.ts'
import { DEFAULT_SHAPE_OPTIONS, ring } from './primitives.ts'
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

const genericElbow = (radius: number, options: ElbowShapeOptions = {}) => {
  const finalOptions = {
    ...DEFAULT_SHAPE_OPTIONS,
    circleSegments: DEFAULT_CIRCLE_SEGMENTS,
    elbowCircleSlices: DEFAULT_ELBOW_CIRCLE_SLICES,
    ...options,
  }
  const { elbowCircleSlices } = finalOptions

  const ringDepth = (TWO_PI * radius) / 4 / elbowCircleSlices // (2.π.R)/4 = 1/4 of circle perimeter.

  for (let theta = 0; theta < HALF_PI; theta += HALF_PI / elbowCircleSlices) {
    isolateTransformations(() => {
      translate(radius / 2, 0, 0)
      rotateZ(-theta)
      translate(-radius / 2, ringDepth / 2, 0)
      rotateX(-HALF_PI)

      ring(radius / 2, ringDepth, options)
    })
  }
}

const elbowRightFromTop = (
  radius: number,
  options: ElbowShapeOptions = {},
  includeTranslation = false,
) => {
  isolateTransformations(() => {
    genericElbow(radius, options)
  })

  if (includeTranslation) translate(radius / 2, radius / 2, 0)
}

const elbowRightFromBottom = (
  radius: number,
  options: ElbowShapeOptions = {},
  includeTranslation = false,
) => {
  isolateTransformations(() => {
    rotateX(PI)

    genericElbow(radius, options)
  })

  if (includeTranslation) translate(radius / 2, -radius / 2, 0)
}

const elbowRightFromBack = (
  radius: number,
  options: ElbowShapeOptions = {},
  includeTranslation = false,
) => {
  isolateTransformations(() => {
    rotateX(-HALF_PI)

    genericElbow(radius, options)
  })

  if (includeTranslation) translate(radius / 2, 0, -radius / 2)
}

const elbowRightFromFront = (
  radius: number,
  options: ElbowShapeOptions = {},
  includeTranslation = false,
) => {
  isolateTransformations(() => {
    rotateX(HALF_PI)

    genericElbow(radius, options)
  })

  if (includeTranslation) translate(radius / 2, 0, radius / 2)
}

const elbowLeftFromTop = (
  radius: number,
  options: ElbowShapeOptions = {},
  includeTranslation = false,
) => {
  isolateTransformations(() => {
    rotateY(PI)

    genericElbow(radius, options)
  })

  if (includeTranslation) translate(-radius / 2, radius / 2, 0)
}

const elbowLeftFromBottom = (
  radius: number,
  options: ElbowShapeOptions = {},
  includeTranslation = false,
) => {
  isolateTransformations(() => {
    rotateX(PI)
    rotateY(PI)

    genericElbow(radius, options)
  })

  if (includeTranslation) translate(-radius / 2, -radius / 2, 0)
}

const elbowLeftFromBack = (
  radius: number,
  options: ElbowShapeOptions = {},
  includeTranslation = false,
) => {
  isolateTransformations(() => {
    rotateX(HALF_PI)
    rotateZ(PI)

    genericElbow(radius, options)
  })

  if (includeTranslation) translate(-radius / 2, 0, -radius / 2)
}

const elbowLeftFromFront = (
  radius: number,
  options: ElbowShapeOptions = {},
  includeTranslation = false,
) => {
  isolateTransformations(() => {
    rotateX(-HALF_PI)
    rotateZ(PI)

    genericElbow(radius, options)
  })

  if (includeTranslation) translate(-radius / 2, 0, radius / 2)
}

const elbowUpFromLeft = (
  radius: number,
  options: ElbowShapeOptions = {},
  includeTranslation = false,
) => {
  isolateTransformations(() => {
    translate(-radius / 2, radius / 2, 0)

    rotateX(PI)

    genericElbow(radius, options)
  })

  if (includeTranslation) translate(-radius / 2, radius / 2, 0)
}

const elbowUpFromRight = (
  radius: number,
  options: ElbowShapeOptions = {},
  includeTranslation = false,
) => {
  isolateTransformations(() => {
    translate(radius / 2, radius / 2, 0)

    rotateX(PI)
    rotateY(PI)

    genericElbow(radius, options)
  })

  if (includeTranslation) translate(radius / 2, radius / 2, 0)
}

const elbowUpFromBack = (
  radius: number,
  options: ElbowShapeOptions = {},
  includeTranslation = false,
) => {
  isolateTransformations(() => {
    translate(0, radius / 2, -radius / 2)
    rotateX(PI)
    rotateY(HALF_PI)

    genericElbow(radius, options)
  })

  if (includeTranslation) translate(0, radius / 2, -radius / 2)
}

const elbowUpFromFront = (
  radius: number,
  options: ElbowShapeOptions = {},
  includeTranslation = false,
) => {
  isolateTransformations(() => {
    translate(0, radius / 2, radius / 2)
    rotateX(PI)
    rotateY(-HALF_PI)

    genericElbow(radius, options)
  })

  if (includeTranslation) translate(0, radius / 2, radius / 2)
}

const elbowDownFromLeft = (
  radius: number,
  options: ElbowShapeOptions = {},
  includeTranslation = false,
) => {
  isolateTransformations(() => {
    translate(-radius / 2, -radius / 2, 0)

    genericElbow(radius, options)
  })

  if (includeTranslation) translate(-radius / 2, -radius / 2, 0)
}

const elbowDownFromRight = (
  radius: number,
  options: ElbowShapeOptions = {},
  includeTranslation = false,
) => {
  isolateTransformations(() => {
    translate(radius / 2, -radius / 2, 0)

    rotateY(PI)

    genericElbow(radius, options)
  })

  if (includeTranslation) translate(radius / 2, -radius / 2, 0)
}

const elbowDownFromBack = (
  radius: number,
  options: ElbowShapeOptions = {},
  includeTranslation = false,
) => {
  isolateTransformations(() => {
    translate(0, -radius / 2, -radius / 2)
    rotateY(-HALF_PI)

    genericElbow(radius, options)
  })

  if (includeTranslation) translate(0, -radius / 2, -radius / 2)
}

const elbowDownFromFront = (
  radius: number,
  options: ElbowShapeOptions = {},
  includeTranslation = false,
) => {
  isolateTransformations(() => {
    translate(0, -radius / 2, radius / 2)
    rotateY(HALF_PI)

    genericElbow(radius, options)
  })

  if (includeTranslation) translate(0, -radius / 2, radius / 2)
}

const elbowFrontFromTop = (
  radius: number,
  options: ElbowShapeOptions = {},
  includeTranslation = false,
) => {
  isolateTransformations(() => {
    rotateY(-HALF_PI)

    genericElbow(radius, options)
  })

  if (includeTranslation) translate(0, radius / 2, radius / 2)
}

const elbowFrontFromBottom = (
  radius: number,
  options: ElbowShapeOptions = {},
  includeTranslation = false,
) => {
  isolateTransformations(() => {
    translate(0, -radius / 2, radius / 2)
    rotateY(-HALF_PI)
    rotateZ(HALF_PI)

    genericElbow(radius, options)
  })

  if (includeTranslation) translate(0, -radius / 2, radius / 2)
}

const elbowFrontFromLeft = (
  radius: number,
  options: ElbowShapeOptions = {},
  includeTranslation = false,
) => {
  isolateTransformations(() => {
    translate(-radius / 2, 0, radius / 2)
    rotateX(-HALF_PI)

    genericElbow(radius, options)
  })

  if (includeTranslation) translate(-radius / 2, 0, radius / 2)
}

const elbowFrontFromRight = (
  radius: number,
  options: ElbowShapeOptions = {},
  includeTranslation = false,
) => {
  isolateTransformations(() => {
    translate(radius / 2, 0, radius / 2)
    rotateX(HALF_PI)
    rotateZ(PI)

    genericElbow(radius, options)
  })

  if (includeTranslation) translate(radius / 2, 0, radius / 2)
}

const elbowBackFromTop = (
  radius: number,
  options: ElbowShapeOptions = {},
  includeTranslation = false,
) => {
  isolateTransformations(() => {
    rotateY(HALF_PI)

    genericElbow(radius, options)
  })

  if (includeTranslation) translate(0, radius / 2, -radius / 2)
}

const elbowBackFromBottom = (
  radius: number,
  options: ElbowShapeOptions = {},
  includeTranslation = false,
) => {
  isolateTransformations(() => {
    rotateY(HALF_PI)
    rotateX(PI)

    genericElbow(radius, options)
  })

  if (includeTranslation) translate(0, -radius / 2, -radius / 2)
}

const elbowBackFromLeft = (
  radius: number,
  options: ElbowShapeOptions = {},
  includeTranslation = false,
) => {
  isolateTransformations(() => {
    translate(-radius / 2, 0, -radius / 2)
    rotateX(HALF_PI)

    genericElbow(radius, options)
  })

  if (includeTranslation) translate(-radius / 2, 0, -radius / 2)
}

const elbowBackFromRight = (
  radius: number,
  options: ElbowShapeOptions = {},
  includeTranslation = false,
) => {
  isolateTransformations(() => {
    translate(radius / 2, 0, -radius / 2)
    rotateX(HALF_PI)
    rotateY(PI)

    genericElbow(radius, options)
  })

  if (includeTranslation) translate(radius / 2, 0, -radius / 2)
}

export const elbow = {
  x: {
    y: elbowUpFromRight,
    z: elbowFrontFromRight,

    ['-y']: elbowDownFromRight,
    ['-z']: elbowBackFromRight,
  },

  y: {
    x: elbowRightFromTop,
    z: elbowFrontFromTop,

    ['-x']: elbowLeftFromTop,
    ['-z']: elbowBackFromTop,
  },

  z: {
    x: elbowRightFromFront,
    y: elbowUpFromFront,

    ['-x']: elbowLeftFromFront,
    ['-y']: elbowDownFromFront,
  },

  ['-x']: {
    y: elbowUpFromLeft,
    z: elbowFrontFromLeft,

    ['-y']: elbowDownFromLeft,
    ['-z']: elbowBackFromLeft,
  },

  ['-y']: {
    x: elbowRightFromBottom,
    z: elbowFrontFromBottom,

    ['-x']: elbowLeftFromBottom,
    ['-z']: elbowBackFromBottom,
  },

  ['-z']: {
    x: elbowRightFromBack,
    y: elbowUpFromBack,

    ['-x']: elbowLeftFromBack,
    ['-y']: elbowDownFromBack,
  },
}
