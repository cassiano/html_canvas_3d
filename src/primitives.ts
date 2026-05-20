import {
  CIRCLE_SEGMENTS,
  LINE_SEGMENTS,
  FOCAL_LENGTH,
  SPHERE_LATITUDE_LINES,
  SPHERE_LONGITUDE_LINES,
  Z_EPSILON,
} from './constants.ts'
import {
  $v,
  FOURTH_DIMENSION_COORD,
  transformationMatrix4x1Type,
  Vector,
} from './vector.ts'
import { Tuple } from './utility_types.ts'
import { timesForEach } from './utils.ts'
import { abs, cos, min, PI, sin } from './math_utils.ts'

type Options3dType = {
  color: string
  lineWidth: number
  opacity: number
  strokeColor: string
}

export const animation = document.getElementById(
  'animation',
) as HTMLCanvasElement

export const ctx = animation.getContext('2d')!

const deferredRenderList: {
  // source: string
  id: number
  z: number
  renderFn: () => void
}[] = []

export const render3dScene = () => {
  const orderedList = deferredRenderList.toSorted((left, right) =>
    abs(right.z - left.z) < Z_EPSILON ? left.id - right.id : right.z - left.z,
  )

  orderedList.forEach(element => element.renderFn())

  deferredRenderList.length = 0
}

export const SCREEN_CENTER = $v(animation.width / 2, animation.height / 2, 0)

const AXIS_LENGTH = min(animation.width, animation.height) * 0.7

export type transformationMatrix4x4Type = Tuple<Tuple<number, 4>, 4>

export const DEFAULT_TRANSFORMATION_MATRIX: transformationMatrix4x4Type =
  // Use ĵ as [0, -1, 0, 0] so the Y-axis in completely inverted, pointing up.
  // prettier-ignore
  [
  //  ȋ   ĵ   k̂  4d
  // --  --  --  --
    [ 1,  0,  0,  0 ],
    [ 0, -1,  0,  0 ],
    [ 0,  0,  1,  0 ],
    [ 0,  0,  0,  1 ],
  ] as const

let transformationMatrix: transformationMatrix4x4Type =
  DEFAULT_TRANSFORMATION_MATRIX.map(row => [
    ...row,
  ]) as transformationMatrix4x4Type
const transformatioMatrixStack: transformationMatrix4x4Type[] = []

const cloneTransformationMatrix = (
  data: transformationMatrix4x4Type,
): transformationMatrix4x4Type =>
  data.map(row => [...row]) as transformationMatrix4x4Type

export const resetTransformationMatrix = () => {
  transformationMatrix = cloneTransformationMatrix(
    DEFAULT_TRANSFORMATION_MATRIX,
  )
}

export const push = () => {
  transformatioMatrixStack.push(cloneTransformationMatrix(transformationMatrix))
}

export const pop = () => {
  const matrix = transformatioMatrixStack.pop()

  if (matrix === undefined) throw new Error('Empty transformation matrix stack')

  transformationMatrix = matrix
}

export const pushMatrix = push // Synonym for `push()`, as used by Processing.
export const popMatrix = pop // Synonym for `pop()`, as used by Processing.

export const isolateTransformations = (fn: () => void) => {
  push()
  fn()
  pop()
}

export const restoreCoordinateSystem = isolateTransformations // Synonym for `isolateTransformations()`.

export const radians = (degrees: number) => (degrees / 360) * (2 * PI)
export const degrees = (radians: number) => (radians / (2 * PI)) * 360

interface ScaleOverloadedSignatures {
  (x: number, y: number, z: number): void
  (xyz: number): void
  (vector: Vector): void
}

export const scale: ScaleOverloadedSignatures = (
  xOrXyzOrVector: number | Vector,
  y?: number,
  z?: number,
): void => {
  const vector =
    typeof xOrXyzOrVector === 'number'
      ? typeof y === 'number'
        ? $v(xOrXyzOrVector, y, z!) // 1st signature: (x, y, z)
        : $v(xOrXyzOrVector, xOrXyzOrVector, xOrXyzOrVector) // 2nd signature: (xyz)
      : xOrXyzOrVector // 3rd signature: (vector)

  if (vector.isAllOnes()) return

  {
    const { x, y, z } = vector

    transformationMatrix = multiplyMatrices(
      transformationMatrix,
      // prettier-ignore
      [
    //  ȋ  ĵ  k̂ 4d
    // -- -- -- --
      [ x, 0, 0, 0 ],
      [ 0, y, 0, 0 ],
      [ 0, 0, z, 0 ],
      [ 0, 0, 0, 1 ],
    ] as const,
    ) as transformationMatrix4x4Type
  }
}

interface TranslateOverloadedSignatures {
  (x: number, y: number, z: number): void
  (vector: Vector): void
}

// Translate using an "Affine Transformation".
export const translate: TranslateOverloadedSignatures = (
  xOrVector: number | Vector,
  y?: number,
  z?: number,
) => {
  const vector =
    typeof xOrVector === 'number' ? $v(xOrVector, y!, z!) : xOrVector

  if (vector.isAllZeros()) return

  {
    const { x, y, z } = vector

    transformationMatrix = multiplyMatrices(
      transformationMatrix,
      // prettier-ignore
      [
    //  ȋ  ĵ  k̂ 4d
    // -- -- -- --
      [ 1, 0, 0, x ],
      [ 0, 1, 0, y ],
      [ 0, 0, 1, z ],
      [ 0, 0, 0, 1 ],
    ] as const,
    ) as transformationMatrix4x4Type
  }
}

// https://aistudio.google.com/app/prompts?state=%7B%22ids%22:%5B%221OL6ezsueUbeXeq3_HvOMHkaVCwXvLuDK%22%5D,%22action%22:%22open%22,%22userId%22:%22113757018662815530084%22,%22resourceKeys%22:%7B%7D%7D&usp=sharing
// Counter-clockwise rotation around an arbitrary axis.
export const rotate = (angle: number, axis: Vector) => {
  if (angle === 0) return

  const normalizedAxis = axis.clone().normalize()
  const { x, y, z } = normalizedAxis

  const c = Math.cos(angle)
  const s = Math.sin(angle)
  const t = 1 - c // Used frequently in the formula.
  const tx = t * x
  const ty = t * y
  const tz = t * z

  transformationMatrix = multiplyMatrices(
    transformationMatrix,
    // prettier-ignore
    [
    //        ȋ               ĵ                k̂         4d
    //  --------------  --------------  ---------------  --
      [     tx * x + c, tx * y - s * z, tx * z + s * y,  0 ],
      [ ty * x + s * z,     ty * y + c, ty * z - s * x,  0 ],
      [ tz * x - s * y, tz * y + s * x,     tz * z + c,  0 ],
      [              0,              0,              0,  1 ],
    ] as const,
  ) as transformationMatrix4x4Type
}

// Counter-clockwise rotation around the X axis.
export const rotateX = (angle: number) => {
  if (angle === 0) return

  const c = Math.cos(angle)
  const s = Math.sin(angle)

  transformationMatrix = multiplyMatrices(
    transformationMatrix,
    // prettier-ignore
    [
    //  ȋ   ĵ   k̂  4d
    // --  --  --  --
      [ 1,  0,  0,  0 ],
      [ 0,  c, -s,  0 ],
      [ 0,  s,  c,  0 ],
      [ 0,  0,  0,  1 ],
    ] as const,
  ) as transformationMatrix4x4Type
}

// Counter-clockwise rotation around the Y axis.
export const rotateY = (angle: number) => {
  if (angle === 0) return

  const c = Math.cos(angle)
  const s = Math.sin(angle)

  transformationMatrix = multiplyMatrices(
    transformationMatrix,
    // prettier-ignore
    [
    //  ȋ   ĵ   k̂  4d
    // --  --  --  --
      [ c,  0, -s,  0 ],
      [ 0,  1,  0,  0 ],
      [ s,  0,  c,  0 ],
      [ 0,  0,  0,  1 ],
    ] as const,
  ) as transformationMatrix4x4Type
}

// Counter-clockwise rotation around the Z axis.
export const rotateZ = (angle: number) => {
  if (angle === 0) return

  const c = Math.cos(angle)
  const s = Math.sin(angle)

  transformationMatrix = multiplyMatrices(
    transformationMatrix,
    // prettier-ignore
    [
    //  ȋ   ĵ   k̂  4d
    // --  --  --  --
      [ c, -s,  0,  0 ],
      [ s,  c,  0,  0 ],
      [ 0,  0,  1,  0 ],
      [ 0,  0,  0,  1 ],
    ] as const,
  ) as transformationMatrix4x4Type
}

export const background = (color: string) => {
  ctx.fillStyle = color
  ctx.fillRect(0, 0, animation.width, animation.height)
}

export const project3dTo2d = ({ x, y, z }: Vector) => {
  const focalLength = FOCAL_LENGTH
  const divisor = z + focalLength // Object should be at z=0 or higher.

  // If the point is behind the camera or exactly on the lens, we return `undefined` so the
  // renderer knows to skip it.
  if (divisor <= 0) return

  // Standard perspective: (coord * focalLength) / (z + focalLength).
  return $v((x * focalLength) / divisor, (y * focalLength) / divisor, 0)
}

// https://aistudio.google.com/app/prompts?state=%7B%22ids%22:%5B%2218pwbUVcOk6C_ICb7JXo82YBAFzJMpz_a%22%5D,%22action%22:%22open%22,%22userId%22:%22113757018662815530084%22,%22resourceKeys%22:%7B%7D%7D&usp=sharing
export const centralize = (point?: Vector) => point?.clone().add(SCREEN_CENTER)

export const transform = (point: Vector, { isNormal = false } = {}) => {
  const pointAs4dMatrix = point.to4dMatrix()

  if (isNormal) pointAs4dMatrix[3][0] = 0 // Ignore the 4th dimension (used for translations) when transforming normals.

  // Notice that a 4x4 matrix multiplied by a 4x1 vector results in another 4x1 vector.
  // Also notice that we use Post-multiplication. See https://aistudio.google.com/app/prompts?state=%7B%22ids%22:%5B%221k6P5M79qGEqAjs7Wp_-21Jqwgzl8_Z6l%22%5D,%22action%22:%22open%22,%22userId%22:%22113757018662815530084%22,%22resourceKeys%22:%7B%7D%7D&usp=sharing
  const transformedPoint = multiplyMatrices(
    transformationMatrix,
    pointAs4dMatrix,
  ) as transformationMatrix4x4Type

  return Vector.from4dMatrix(
    transformedPoint as unknown as transformationMatrix4x1Type,
  )
}

const toScreen = (point: Vector) => centralize(project3dTo2d(transform(point)))!

export const point = (point3d: Vector, { color = 'black', size = 1 } = {}) => {
  const screen = toScreen(point3d)

  // Skip rendering if point is behind camera.
  if (!screen) return

  const renderFn = () => {
    ctx.fillStyle = color
    ctx.fillRect(screen.x - size / 2, screen.y - size / 2, size, size)
  }

  deferredRenderList.push({
    // source: `point ${point3d.toString()}`,
    id: deferredRenderList.length,
    z: calculateZ(point3d),
    renderFn,
  })
}

export const line = (
  point3dA: Vector,
  point3dB: Vector,
  { color = 'black', lineWidth = 1, avoidSplit = false } = {},
) => {
  const screenA = toScreen(point3dA)
  const screenB = toScreen(point3dB)

  // Skip rendering if either point is behind camera.
  if (!screenA || !screenB) return

  if (avoidSplit) {
    const center = point3dA.inBetween(point3dB)

    const renderFn = () => {
      ctx.strokeStyle = color
      ctx.lineWidth = lineWidth
      ctx.beginPath()
      ctx.moveTo(screenA.x, screenA.y)
      ctx.lineTo(screenB.x, screenB.y)
      ctx.stroke()
    }

    deferredRenderList.push({
      // source: `line from A=${point3dA.toString()} to B=${point3dB.toString()}`,
      id: deferredRenderList.length,
      z: calculateZ(center),
      renderFn,
    })
  } else {
    let latestPoint = point3dA

    timesForEach(LINE_SEGMENTS, i => {
      const nextPoint = point3dA.inBetween(
        point3dB,
        (1 / LINE_SEGMENTS) * (i + 1),
      )
      const center = latestPoint.inBetween(nextPoint)

      const { x: x1, y: y1 } = toScreen(latestPoint)
      const { x: x2, y: y2 } = toScreen(nextPoint)

      // const previousLatestAsString = latestPoint.toString()
      latestPoint = nextPoint

      const renderFn = () => {
        ctx.strokeStyle = color
        ctx.lineWidth = lineWidth
        ctx.beginPath()
        ctx.moveTo(x1, y1)
        ctx.lineTo(x2, y2)
        ctx.stroke()
      }

      deferredRenderList.push({
        // source: `line segment with center ${center.toString()} from ${previousLatestAsString} to ${nextPoint.toString()}`,
        id: deferredRenderList.length,
        z: calculateZ(center),
        renderFn,
      })
    })
  }
}

export const triangle2d = (
  point2dA: Vector,
  point2dB: Vector,
  point2dC: Vector,
  {
    color = 'gray',
    lineWidth = 1,
    opacity = 1,
    strokeColor = 'black',
    noStroke = false,
  } = {},
) => {
  const screenA = toScreen(point2dA)
  const screenB = toScreen(point2dB)
  const screenC = toScreen(point2dC)

  // Skip rendering if any point is behind camera.
  if (!screenA || !screenB || !screenC) return

  const renderFn = () => {
    ctx.beginPath() // Start the shape
    ctx.moveTo(screenA.x, screenA.y) // Move to starting point
    ctx.lineTo(screenB.x, screenB.y)
    ctx.lineTo(screenC.x, screenC.y)
    ctx.closePath() // Close path

    ctx.save()
    ctx.globalAlpha = opacity //  Set transparency
    ctx.fillStyle = color

    if (!noStroke) {
      ctx.strokeStyle = strokeColor
      ctx.lineWidth = lineWidth
      ctx.stroke() // Outline the shape
    }

    ctx.fill() // Fill the shape
    ctx.restore()
  }

  const centroid2d = $v(
    (point2dA.x + point2dB.x + point2dC.x) / 3,
    (point2dA.y + point2dB.y + point2dC.y) / 3,
  )

  // const normal = centroid2d.clone().setZ(1)

  deferredRenderList.push({
    // source: `triangle with A=${point2dA.toString()}, B=${point2dB.toString()} and C=${point2dC.toString()}`,
    id: deferredRenderList.length,
    z: calculateZ(centroid2d),
    renderFn,
  })
}

export const quadrilateral2d = (
  point2dA: Vector,
  point2dB: Vector,
  point2dC: Vector,
  point2dD: Vector,
  { color = 'gray', lineWidth = 1, opacity = 1, strokeColor = 'black' } = {},
) => {
  const options = {
    color,
    lineWidth,
    opacity,
    strokeColor,
    // noStroke: true,
  }

  triangle2d(point2dA, point2dB, point2dC, options)
  triangle2d(point2dA, point2dC, point2dD, options)
  // line(point2dA, point2dB, { avoidSplit: true })
  // line(point2dB, point2dC, { avoidSplit: true })
  // line(point2dC, point2dD, { avoidSplit: true })
  // line(point2dD, point2dA, { avoidSplit: true })
}

export const rect2d = (
  width: number, // x-axis
  height: number, // y-axis
  { color = 'gray', lineWidth = 1, opacity = 1, strokeColor = 'black' } = {},
) => {
  const options = {
    color,
    lineWidth,
    opacity,
    strokeColor,
  }

  const point2dA = $v(-width / 2, -height / 2)
  const point2dB = $v(width / 2, -height / 2)
  const point2dC = $v(width / 2, height / 2)
  const point2dD = $v(-width / 2, height / 2)

  quadrilateral2d(point2dA, point2dB, point2dC, point2dD, options)
}

export const square2d = (
  side: number,
  { color = 'gray', lineWidth = 1, opacity = 1, strokeColor = 'black' } = {},
) => {
  const options = {
    color,
    lineWidth,
    opacity,
    strokeColor,
  }

  rect2d(side, side, options)
}

export const box = (
  width: number, // x-axis
  height: number, // y-axis
  depth: number, // z-axis
  { color = 'gray', lineWidth = 1, opacity = 1, strokeColor = 'black' } = {},
) => {
  const options = {
    color,
    lineWidth,
    opacity,
    strokeColor,
  }

  // Back face (-z).
  isolateTransformations(() => {
    translate(0, 0, -depth / 2)
    rotateX(PI)

    rect2d(width, height, options)
  })

  // Front face (+z).
  isolateTransformations(() => {
    translate(0, 0, depth / 2)

    rect2d(width, height, options)
  })

  // Left face (-x).
  isolateTransformations(() => {
    translate(-width / 2, 0, 0)
    rotateY(-PI / 2) // Turn 90ᵒ clockwise.

    rect2d(depth, height, options)
  })

  // Right face (+x).
  isolateTransformations(() => {
    translate(width / 2, 0, 0)
    rotateY(PI / 2) // Turn 90ᵒ counter-clockwise.

    rect2d(depth, height, options)
  })

  // Bottom face (-y).
  isolateTransformations(() => {
    translate(0, -height / 2, 0)
    rotateX(PI / 2) // Turn 90ᵒ counter-clockwise.

    rect2d(width, depth, options)
  })

  // Top face (+y).
  isolateTransformations(() => {
    translate(0, height / 2, 0)
    rotateX(-PI / 2) // Turn 90ᵒ clockwise.

    rect2d(width, depth, options)
  })
}

export const cube = (
  size: number,
  { color = 'gray', lineWidth = 1, opacity = 1, strokeColor = 'black' } = {},
) => box(size, size, size, { color, lineWidth, opacity, strokeColor })

export const circle2d = (
  radius: number,
  { color = 'gray', lineWidth = 1 } = {},
) => {
  let previousPoint: Vector | undefined

  for (let theta = 0; theta <= 2 * PI; theta += (2 * PI) / CIRCLE_SEGMENTS) {
    const currentPoint = $v(radius * sin(theta), radius * cos(theta), 0)

    if (previousPoint !== undefined)
      line(previousPoint, currentPoint, { color, lineWidth, avoidSplit: true })

    previousPoint = currentPoint
  }
}

export const sphere = (
  radius: number,
  // deno-lint-ignore no-unused-vars
  { color = 'gray', lineWidth = 1, opacity = 1 } = {},
) => {
  isolateTransformations(() => {
    // Draw a series of concentric 2D circles as longitude lines, all with the same radius.
    timesForEach(SPHERE_LONGITUDE_LINES, () => {
      rotateY(PI / SPHERE_LONGITUDE_LINES)

      circle2d(radius, { color, lineWidth })
    })

    // Draw a series of 2D circles as latitude lines, with radius increasing when going from the poles
    // to the equator (center) and decreasing otherwise.
    for (
      let theta = 0;
      theta <= PI;
      theta += PI / (SPHERE_LATITUDE_LINES + 1)
    ) {
      isolateTransformations(() => {
        translate(0, radius * cos(theta), 0)
        rotateX(PI / 2)

        circle2d(radius * sin(theta), { color, lineWidth })
      })
    }
  })
}

export const text2d = (message: string, point: Vector) => {
  ctx.font = 'bold 60px sans-serif'
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)' // Semi-transparent black
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  const position = transform(point).clone().add(SCREEN_CENTER)

  ctx.fillText(message, position.x, position.y)
}

export const render3dAxes = () => {
  const xNeg = $v(-AXIS_LENGTH / 2, 0, 0)
  const xPos = $v(AXIS_LENGTH / 2, 0, 0)

  const yNeg = $v(0, -AXIS_LENGTH / 2, 0)
  const yPos = $v(0, AXIS_LENGTH / 2, 0)

  const zNeg = $v(0, 0, -AXIS_LENGTH / 2)
  const zPos = $v(0, 0, AXIS_LENGTH / 2)

  // X-axis
  line(xNeg, xPos, { color: 'darkRed' })
  point(xPos, { color: 'red', size: 12 })

  // Y-axis
  line(yNeg, yPos, { color: 'darkGreen' })
  point(yPos, { color: 'green', size: 12 })

  // Z-axis
  line(zNeg, zPos, { color: 'darkBlue' })
  point(zPos, { color: 'blue', size: 12 })
}

export const multiplyMatrices = (
  leftMatrix: number[][],
  rightMatrix: number[][],
): number[][] => {
  const colsLeft = leftMatrix[0].length
  const colsRight = rightMatrix[0].length
  const rowsLeft = leftMatrix.length
  const rowsRight = rightMatrix.length

  if (colsLeft !== rowsRight)
    throw new Error(
      `Number of columns from left matrix (${colsLeft}) must match number of rows from right one (${rowsRight})`,
    )

  const result: number[][] = []

  for (let row = 0; row < rowsLeft; row++) {
    result[row] = []

    for (let col = 0; col < colsRight; col++) {
      result[row][col] = 0

      // colsLeft = rowsRight
      for (let i = 0; i < colsLeft; i++)
        result[row][col] += leftMatrix[row][i] * rightMatrix[i][col]
    }
  }

  return result
}

export const inverseMultiplyMatrices = (
  leftMatrix: number[][],
  rightMatrix: number[][],
): number[][] => multiplyMatrices(rightMatrix, leftMatrix)

const calculateZ = (point3d: Vector): number => {
  const thirdRow = transformationMatrix[2]

  return (
    thirdRow[0] * point3d.x +
    thirdRow[1] * point3d.y +
    thirdRow[2] * point3d.z +
    thirdRow[3] * FOURTH_DIMENSION_COORD
  )
}
