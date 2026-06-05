import { PI } from './math_utils.ts'
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

export const elbow = (radius: number, options: ElbowShapeOptions = {}) => {
  const finalOptions = {
    ...DEFAULT_SHAPE_OPTIONS,
    circleSegments: DEFAULT_CIRCLE_SEGMENTS,
    elbowCircleSlices: DEFAULT_ELBOW_CIRCLE_SLICES,
    ...options,
  }
  const { elbowCircleSlices } = finalOptions

  const ringDepth = (2 * PI * radius) / 4 / elbowCircleSlices // (2.π.R)/4 = 1/4 of circle perimeter.

  for (let theta = 0; theta < PI / 2; theta += PI / 2 / elbowCircleSlices) {
    isolateTransformations(() => {
      translate(radius / 2, 0, 0)
      rotateZ(-theta)
      translate(-radius / 2, ringDepth / 2, 0)
      rotateX(-PI / 2)

      ring(radius / 2, ringDepth, options)
    })
  }
}

export const elbowRightPosY = (
  radius: number,
  options: ElbowShapeOptions = {},
  includeTranslation = false,
) => {
  isolateTransformations(() => {
    elbow(radius, options)
  })

  if (includeTranslation) translate(radius / 2, radius / 2, 0)
}

export const elbowRightNegY = (
  radius: number,
  options: ElbowShapeOptions = {},
  includeTranslation = false,
) => {
  isolateTransformations(() => {
    rotateX(PI)

    elbow(radius, options)
  })

  if (includeTranslation) translate(radius / 2, -radius / 2, 0)
}

export const elbowRightNegZ = (
  radius: number,
  options: ElbowShapeOptions = {},
  includeTranslation = false,
) => {
  isolateTransformations(() => {
    rotateX(-PI / 2)

    elbow(radius, options)
  })

  if (includeTranslation) translate(radius / 2, 0, -radius / 2)
}

export const elbowRightPosZ = (
  radius: number,
  options: ElbowShapeOptions = {},
  includeTranslation = false,
) => {
  isolateTransformations(() => {
    rotateX(PI / 2)

    elbow(radius, options)
  })

  if (includeTranslation) translate(radius / 2, 0, radius / 2)
}

export const elbowLeftPosY = (
  radius: number,
  options: ElbowShapeOptions = {},
  includeTranslation = false,
) => {
  isolateTransformations(() => {
    rotateY(PI)

    elbow(radius, options)
  })

  if (includeTranslation) translate(-radius / 2, radius / 2, 0)
}

export const elbowLeftNegY = (
  radius: number,
  options: ElbowShapeOptions = {},
  includeTranslation = false,
) => {
  isolateTransformations(() => {
    rotateX(PI)
    rotateY(PI)

    elbow(radius, options)
  })

  if (includeTranslation) translate(-radius / 2, -radius / 2, 0)
}

export const elbowLeftNegZ = (
  radius: number,
  options: ElbowShapeOptions = {},
  includeTranslation = false,
) => {
  isolateTransformations(() => {
    rotateX(PI / 2)
    rotateZ(PI)

    elbow(radius, options)
  })

  if (includeTranslation) translate(-radius / 2, 0, -radius / 2)
}

export const elbowLeftPosZ = (
  radius: number,
  options: ElbowShapeOptions = {},
  includeTranslation = false,
) => {
  isolateTransformations(() => {
    rotateX(-PI / 2)
    rotateZ(PI)

    elbow(radius, options)
  })

  if (includeTranslation) translate(-radius / 2, 0, radius / 2)
}

export const elbowUpNegX = (
  radius: number,
  options: ElbowShapeOptions = {},
  includeTranslation = false,
) => {
  isolateTransformations(() => {
    translate(-radius / 2, radius / 2, 0)

    rotateX(PI)

    elbow(radius, options)
  })

  if (includeTranslation) translate(-radius / 2, radius / 2, 0)
}

export const elbowUpPosX = (
  radius: number,
  options: ElbowShapeOptions = {},
  includeTranslation = false,
) => {
  isolateTransformations(() => {
    translate(radius / 2, radius / 2, 0)

    rotateX(PI)
    rotateY(PI)

    elbow(radius, options)
  })

  if (includeTranslation) translate(radius / 2, radius / 2, 0)
}

export const elbowUpNegZ = (
  radius: number,
  options: ElbowShapeOptions = {},
  includeTranslation = false,
) => {
  isolateTransformations(() => {
    translate(0, radius / 2, -radius / 2)
    rotateX(PI)
    rotateY(PI / 2)

    elbow(radius, options)
  })

  if (includeTranslation) translate(0, radius / 2, -radius / 2)
}

export const elbowUpPosZ = (
  radius: number,
  options: ElbowShapeOptions = {},
  includeTranslation = false,
) => {
  isolateTransformations(() => {
    translate(0, radius / 2, radius / 2)
    rotateX(PI)
    rotateY(-PI / 2)

    elbow(radius, options)
  })

  if (includeTranslation) translate(0, radius / 2, radius / 2)
}

export const elbowDownNegX = (
  radius: number,
  options: ElbowShapeOptions = {},
  includeTranslation = false,
) => {
  isolateTransformations(() => {
    translate(-radius / 2, -radius / 2, 0)

    elbow(radius, options)
  })

  if (includeTranslation) translate(-radius / 2, -radius / 2, 0)
}

export const elbowDownPosX = (
  radius: number,
  options: ElbowShapeOptions = {},
  includeTranslation = false,
) => {
  isolateTransformations(() => {
    translate(radius / 2, -radius / 2, 0)

    rotateY(PI)

    elbow(radius, options)
  })

  if (includeTranslation) translate(radius / 2, -radius / 2, 0)
}

export const elbowDownNegZ = (
  radius: number,
  options: ElbowShapeOptions = {},
  includeTranslation = false,
) => {
  isolateTransformations(() => {
    translate(0, -radius / 2, -radius / 2)
    rotateY(-PI / 2)

    elbow(radius, options)
  })

  if (includeTranslation) translate(0, -radius / 2, -radius / 2)
}

export const elbowDownPosZ = (
  radius: number,
  options: ElbowShapeOptions = {},
  includeTranslation = false,
) => {
  isolateTransformations(() => {
    translate(0, -radius / 2, radius / 2)
    rotateY(PI / 2)

    elbow(radius, options)
  })

  if (includeTranslation) translate(0, -radius / 2, radius / 2)
}

export const elbowFrontPosY = (
  radius: number,
  options: ElbowShapeOptions = {},
  includeTranslation = false,
) => {
  isolateTransformations(() => {
    rotateY(-PI / 2)

    elbow(radius, options)
  })

  if (includeTranslation) translate(0, radius / 2, radius / 2)
}

export const elbowFrontNegY = (
  radius: number,
  options: ElbowShapeOptions = {},
  includeTranslation = false,
) => {
  isolateTransformations(() => {
    translate(0, -radius / 2, radius / 2)
    rotateY(-PI / 2)
    rotateZ(PI / 2)

    elbow(radius, options)
  })

  if (includeTranslation) translate(0, -radius / 2, radius / 2)
}

export const elbowFrontNegX = (
  radius: number,
  options: ElbowShapeOptions = {},
  includeTranslation = false,
) => {
  isolateTransformations(() => {
    translate(-radius / 2, 0, radius / 2)
    rotateX(-PI / 2)

    elbow(radius, options)
  })

  if (includeTranslation) translate(-radius / 2, 0, radius / 2)
}

export const elbowFrontPosX = (
  radius: number,
  options: ElbowShapeOptions = {},
  includeTranslation = false,
) => {
  isolateTransformations(() => {
    translate(radius / 2, 0, radius / 2)
    rotateX(PI / 2)
    rotateZ(PI)

    elbow(radius, options)
  })

  if (includeTranslation) translate(radius / 2, 0, radius / 2)
}

export const elbowBackPosY = (
  radius: number,
  options: ElbowShapeOptions = {},
  includeTranslation = false,
) => {
  isolateTransformations(() => {
    rotateY(PI / 2)

    elbow(radius, options)
  })

  if (includeTranslation) translate(0, radius / 2, -radius / 2)
}

export const elbowBackNegY = (
  radius: number,
  options: ElbowShapeOptions = {},
  includeTranslation = false,
) => {
  isolateTransformations(() => {
    rotateY(PI / 2)
    rotateX(PI)

    elbow(radius, options)
  })

  if (includeTranslation) translate(0, -radius / 2, -radius / 2)
}

export const elbowBackNegX = (
  radius: number,
  options: ElbowShapeOptions = {},
  includeTranslation = false,
) => {
  isolateTransformations(() => {
    translate(-radius / 2, 0, -radius / 2)
    rotateX(PI / 2)

    elbow(radius, options)
  })

  if (includeTranslation) translate(-radius / 2, 0, -radius / 2)
}

export const elbowBackPosX = (
  radius: number,
  options: ElbowShapeOptions = {},
  includeTranslation = false,
) => {
  isolateTransformations(() => {
    translate(radius / 2, 0, -radius / 2)
    rotateX(PI / 2)
    rotateY(PI)

    elbow(radius, options)
  })

  if (includeTranslation) translate(radius / 2, 0, -radius / 2)
}
