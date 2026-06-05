import { PI } from './math_utils.ts'
import { ElbowShapeOptions } from './primitives.ts'
import {
  isolateTransformations,
  elbow,
  rotateX,
  rotateY,
  translate,
  rotateZ,
} from './primitives.ts'

export const elbowRightPosY = (
  radius: number,
  options: ElbowShapeOptions = {},
) => {
  isolateTransformations(() => {
    elbow(radius, options)
  })
}
export const elbowRightNegY = (
  radius: number,
  options: ElbowShapeOptions = {},
) => {
  isolateTransformations(() => {
    rotateX(PI)

    elbow(radius, options)
  })
}
export const elbowRightNegZ = (
  radius: number,
  options: ElbowShapeOptions = {},
) => {
  isolateTransformations(() => {
    rotateX(-PI / 2)

    elbow(radius, options)
  })
}
export const elbowRightPosZ = (
  radius: number,
  options: ElbowShapeOptions = {},
) => {
  isolateTransformations(() => {
    rotateX(PI / 2)

    elbow(radius, options)
  })
}

export const elbowLeftPosY = (
  radius: number,
  options: ElbowShapeOptions = {},
) => {
  isolateTransformations(() => {
    rotateY(PI)

    elbow(radius, options)
  })
}
export const elbowLeftNegY = (
  radius: number,
  options: ElbowShapeOptions = {},
) => {
  isolateTransformations(() => {
    rotateX(PI)
    rotateY(PI)

    elbow(radius, options)
  })
}
export const elbowLeftNegZ = (
  radius: number,
  options: ElbowShapeOptions = {},
) => {
  isolateTransformations(() => {
    rotateX(PI / 2)
    rotateZ(PI)

    elbow(radius, options)
  })
}
export const elbowLeftPosZ = (
  radius: number,
  options: ElbowShapeOptions = {},
) => {
  isolateTransformations(() => {
    rotateX(-PI / 2)
    rotateZ(PI)

    elbow(radius, options)
  })
}

export const elbowUpNegX = (
  radius: number,
  options: ElbowShapeOptions = {},
) => {
  isolateTransformations(() => {
    translate(-radius / 2, radius / 2, 0)
    rotateX(PI)

    elbow(radius, options)
  })
}
export const elbowUpPosX = (
  radius: number,
  options: ElbowShapeOptions = {},
) => {
  isolateTransformations(() => {
    translate(radius / 2, radius / 2, 0)
    rotateX(PI)
    rotateY(PI)

    elbow(radius, options)
  })
}
export const elbowUpNegZ = (
  radius: number,
  options: ElbowShapeOptions = {},
) => {
  isolateTransformations(() => {
    translate(0, radius / 2, -radius / 2)
    rotateX(PI)
    rotateY(PI / 2)

    elbow(radius, options)
  })
}
export const elbowUpPosZ = (
  radius: number,
  options: ElbowShapeOptions = {},
) => {
  isolateTransformations(() => {
    translate(0, radius / 2, radius / 2)
    rotateX(PI)
    rotateY(-PI / 2)

    elbow(radius, options)
  })
}

export const elbowDownNegX = (
  radius: number,
  options: ElbowShapeOptions = {},
) => {
  isolateTransformations(() => {
    translate(-radius / 2, -radius / 2, 0)

    elbow(radius, options)
  })
}
export const elbowDownPosX = (
  radius: number,
  options: ElbowShapeOptions = {},
) => {
  isolateTransformations(() => {
    translate(radius / 2, -radius / 2, 0)
    rotateY(PI)

    elbow(radius, options)
  })
}
export const elbowDownNegZ = (
  radius: number,
  options: ElbowShapeOptions = {},
) => {
  isolateTransformations(() => {
    translate(0, -radius / 2, -radius / 2)
    rotateY(-PI / 2)

    elbow(radius, options)
  })
}
export const elbowDownPosZ = (
  radius: number,
  options: ElbowShapeOptions = {},
) => {
  isolateTransformations(() => {
    translate(0, -radius / 2, radius / 2)
    rotateY(PI / 2)

    elbow(radius, options)
  })
}

export const elbowFrontPosY = (
  radius: number,
  options: ElbowShapeOptions = {},
) => {
  isolateTransformations(() => {
    rotateY(-PI / 2)

    elbow(radius, options)
  })
}
export const elbowFrontNegY = (
  radius: number,
  options: ElbowShapeOptions = {},
) => {
  isolateTransformations(() => {
    translate(0, -radius / 2, radius / 2)
    rotateY(-PI / 2)
    rotateZ(PI / 2)

    elbow(radius, options)
  })
}
export const elbowFrontNegX = (
  radius: number,
  options: ElbowShapeOptions = {},
) => {
  isolateTransformations(() => {
    translate(-radius / 2, 0, radius / 2)
    rotateX(-PI / 2)

    elbow(radius, options)
  })
}
export const elbowFrontPosX = (
  radius: number,
  options: ElbowShapeOptions = {},
) => {
  isolateTransformations(() => {
    translate(radius / 2, 0, radius / 2)
    rotateX(PI / 2)
    rotateZ(PI)

    elbow(radius, options)
  })
}

export const elbowBackPosY = (
  radius: number,
  options: ElbowShapeOptions = {},
) => {
  isolateTransformations(() => {
    translate(0, -radius / 2, radius / 2)
    rotateY(PI / 2)

    elbow(radius, options)
  })
}
export const elbowBackNegY = (
  radius: number,
  options: ElbowShapeOptions = {},
) => {
  isolateTransformations(() => {
    rotateY(PI / 2)
    rotateX(PI)

    elbow(radius, options)
  })
}
export const elbowBackNegX = (
  radius: number,
  options: ElbowShapeOptions = {},
) => {
  isolateTransformations(() => {
    translate(-radius / 2, 0, -radius / 2)
    rotateX(PI / 2)

    elbow(radius, options)
  })
}
export const elbowBackPosX = (
  radius: number,
  options: ElbowShapeOptions = {},
) => {
  isolateTransformations(() => {
    translate(radius / 2, 0, -radius / 2)
    rotateX(PI / 2)
    rotateY(PI)

    elbow(radius, options)
  })
}
