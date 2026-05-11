import {
  CIRCLE_SEGMENTS,
  SCREEN_Z_DISTANCE,
  SPHERE_LATITUDE_LINES,
  SPHERE_LONGITUDE_LINES,
} from './constants.ts'
import { $v, transformationMatrix4x1Type, Vector } from './vector.ts'
import { Tuple } from './utility_types.ts'
import { cos, min, PI, sin, timesForEach } from './utils.ts'

export const animation = document.getElementById(
  'animation',
) as HTMLCanvasElement

export const ctx = animation.getContext('2d')!

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

let transformationMatrix: transformationMatrix4x4Type
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
        ? $v(xOrXyzOrVector, y, z!) // 1st signature.
        : $v(xOrXyzOrVector, xOrXyzOrVector, xOrXyzOrVector) // 2nd signature.
      : xOrXyzOrVector // 3rd signature.

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

  const normalizedAxis = axis.normalize(false)
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
    //               ȋ               ĵ                k̂  4d
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
  const focalLength = SCREEN_Z_DISTANCE
  const divisor = z + focalLength // Object should be at z=0 or higher.

  // If the point is behind the camera or exactly on the lens, we return `undefined` so the
  // renderer knows to skip it.
  if (divisor <= 0) return

  // Standard perspective: (coord * focalLength) / (z + focalLength).
  return $v((x * focalLength) / divisor, (y * focalLength) / divisor, 0)
}

// https://aistudio.google.com/app/prompts?state=%7B%22ids%22:%5B%2218pwbUVcOk6C_ICb7JXo82YBAFzJMpz_a%22%5D,%22action%22:%22open%22,%22userId%22:%22113757018662815530084%22,%22resourceKeys%22:%7B%7D%7D&usp=sharing
export const centralize = (point?: Vector) => point?.add(SCREEN_CENTER, false)

export const transform = (point: Vector) => {
  // Notice that a 4x4 matrix multiplied by a 4x1 vector results in another 4x1 vector.
  // Also notice that we use Post-multiplication. See https://aistudio.google.com/app/prompts?state=%7B%22ids%22:%5B%221k6P5M79qGEqAjs7Wp_-21Jqwgzl8_Z6l%22%5D,%22action%22:%22open%22,%22userId%22:%22113757018662815530084%22,%22resourceKeys%22:%7B%7D%7D&usp=sharing
  const transformedPoint = multiplyMatrices(
    transformationMatrix,
    point.to4dMatrix(),
  ) as transformationMatrix4x4Type

  return Vector.from4dMatrix(
    transformedPoint as unknown as transformationMatrix4x1Type,
  )
}

const toScreen = (point: Vector) => centralize(project3dTo2d(transform(point)))!

export const point = (coords: Vector, { color = 'black', size = 1 } = {}) => {
  const projected = toScreen(coords)

  // Skip rendering if behind camera.
  if (!projected) return

  ctx.fillStyle = color
  ctx.fillRect(projected.x - size / 2, projected.y - size / 2, size, size)
}

export const line = (
  pointA: Vector,
  pointB: Vector,
  { color = 'black', lineWidth = 1 } = {},
) => {
  const projectedA = toScreen(pointA)
  const projectedB = toScreen(pointB)

  // If either point is behind the camera, skip the line. (In advanced engines, you'd "clip" the
  // line at the Z-boundary, but skipping is enough to stop the "random lines").
  if (!projectedA || !projectedB) return

  ctx.strokeStyle = color
  ctx.lineWidth = lineWidth
  ctx.beginPath()
  ctx.moveTo(projectedA.x, projectedA.y)
  ctx.lineTo(projectedB.x, projectedB.y)
  ctx.stroke()
}

export const planeXY = (
  width: number, // x-axis
  height: number, // y-axis
  { color = 'gray', lineWidth = 1, opacity = 1 } = {},
) => box(width, height, 0, { color, lineWidth })

export const planeXZ = (
  width: number, // x-axis
  depth: number, // z-axis
  { color = 'gray', lineWidth = 1, opacity = 1 } = {},
) => box(width, 0, depth, { color, lineWidth })

export const planeYZ = (
  height: number, // y-axis
  depth: number, // z-axis
  { color = 'gray', lineWidth = 1, opacity = 1 } = {},
) => box(0, height, depth, { color, lineWidth })

const fillShapeXY = (
  bottomLeft: Vector,
  width: number, // x-axis
  height: number, // y-axis
  { color = 'gray', lineWidth = 1, opacity = 1 } = {},
) => {
  ctx.beginPath() // Start the shape

  const bottomLeft2d = toScreen(bottomLeft)
  ctx.moveTo(bottomLeft2d.x, bottomLeft2d.y) // Move to starting point

  const topLeft2d = toScreen(bottomLeft.add($v(0, height, 0), false))
  ctx.lineTo(topLeft2d.x, topLeft2d.y)

  const topRight2d = toScreen(bottomLeft.add($v(width, height, 0), false))
  ctx.lineTo(topRight2d.x, topRight2d.y)

  const lowerRight2d = toScreen(bottomLeft.add($v(width, 0, 0), false))
  ctx.lineTo(lowerRight2d.x, lowerRight2d.y)

  ctx.closePath() // Close path

  ctx.save()
  ctx.globalAlpha = opacity //  Set transparency
  ctx.fillStyle = color
  ctx.strokeStyle = 'black'
  ctx.lineWidth = lineWidth
  ctx.stroke() // Outline the shape
  ctx.fill() // Fill the shape
  ctx.restore()
}

const fillShapeXZ = (
  bottomLeft: Vector,
  width: number, // x-axis
  depth: number, // z-axis
  { color = 'gray', lineWidth = 1, opacity = 1 } = {},
) => {
  ctx.beginPath() // Start the shape

  const bottomLeft2d = toScreen(bottomLeft)
  ctx.moveTo(bottomLeft2d.x, bottomLeft2d.y) // Move to starting point

  const topLeft2d = toScreen(bottomLeft.add($v(0, 0, depth), false))
  ctx.lineTo(topLeft2d.x, topLeft2d.y)

  const topRight2d = toScreen(bottomLeft.add($v(width, 0, depth), false))
  ctx.lineTo(topRight2d.x, topRight2d.y)

  const lowerRight2d = toScreen(bottomLeft.add($v(width, 0, 0), false))
  ctx.lineTo(lowerRight2d.x, lowerRight2d.y)

  ctx.closePath() // Close path

  ctx.save()
  ctx.globalAlpha = opacity //  Set transparency
  ctx.fillStyle = color
  ctx.strokeStyle = 'black'
  ctx.lineWidth = lineWidth
  ctx.stroke() // Outline the shape
  ctx.fill() // Fill the shape
  ctx.restore()
}

const fillShapeYZ = (
  bottomLeft: Vector,
  height: number, // y-axis
  depth: number, // z-axis
  { color = 'gray', lineWidth = 1, opacity = 1 } = {},
) => {
  ctx.beginPath() // Start the shape

  const bottomLeft2d = toScreen(bottomLeft)
  ctx.moveTo(bottomLeft2d.x, bottomLeft2d.y) // Move to starting point

  const topLeft2d = toScreen(bottomLeft.add($v(0, 0, depth), false))
  ctx.lineTo(topLeft2d.x, topLeft2d.y)

  const topRight2d = toScreen(bottomLeft.add($v(0, height, depth), false))
  ctx.lineTo(topRight2d.x, topRight2d.y)

  const lowerRight2d = toScreen(bottomLeft.add($v(0, height, 0), false))
  ctx.lineTo(lowerRight2d.x, lowerRight2d.y)

  ctx.closePath() // Close path

  ctx.save()
  ctx.globalAlpha = opacity //  Set transparency
  ctx.fillStyle = color
  ctx.strokeStyle = 'black'
  ctx.lineWidth = lineWidth
  ctx.stroke() // Outline the shape
  ctx.fill() // Fill the shape
  ctx.restore()
}

export const box = (
  width: number, // x-axis
  height: number, // y-axis
  depth: number, // z-axis
  { color = 'gray', lineWidth = 1, opacity = 1 } = {},
) => {
  const vertices = [
    $v(width / 2, height / 2, depth / 2),
    $v(width / 2, height / 2, -depth / 2),
    $v(width / 2, -height / 2, -depth / 2),
    $v(width / 2, -height / 2, depth / 2),
    $v(-width / 2, height / 2, depth / 2),
    $v(-width / 2, height / 2, -depth / 2),
    $v(-width / 2, -height / 2, -depth / 2),
    $v(-width / 2, -height / 2, depth / 2),
  ]

  const connections = [
    [0, 1, 2, 3], // Front face.
    [4, 5, 6, 7], // Back face.
    // Connecting lines.
    [0, 4],
    [1, 5],
    [2, 6],
    [3, 7],
  ]

  let faceAlreadyFilled = false // Used when rendering a plane (width, height or depth is 0).

  const fillLeftRightFaces = (face: Vector) => {
    if (height > 0 && depth > 0 && (width > 0 || !faceAlreadyFilled)) {
      fillShapeYZ(
        face.add($v(0, -height / 2, -depth / 2), false),
        height,
        depth,
        { color, lineWidth, opacity },
      )

      faceAlreadyFilled = true
    }
  }

  const fillTopBottomFaces = (face: Vector) => {
    if (width > 0 && depth > 0 && (height > 0 || !faceAlreadyFilled)) {
      fillShapeXZ(
        face.add($v(-width / 2, 0, -depth / 2), false),
        width,
        depth,
        {
          color,
          lineWidth,
          opacity,
        },
      )

      faceAlreadyFilled = true
    }
  }

  const fillBackFrontFaces = (face: Vector) => {
    if (width > 0 && height > 0 && (depth > 0 || !faceAlreadyFilled)) {
      fillShapeXY(
        face.add($v(-width / 2, -height / 2, 0), false),
        width,
        height,
        { color, lineWidth, opacity },
      )

      faceAlreadyFilled = true
    }
  }

  const faces = [
    { center: $v(-width / 2, 0, 0), fillFn: fillLeftRightFaces },
    { center: $v(width / 2, 0, 0), fillFn: fillLeftRightFaces },
    { center: $v(0, height / 2, 0), fillFn: fillTopBottomFaces },
    { center: $v(0, -height / 2, 0), fillFn: fillTopBottomFaces },
    { center: $v(0, 0, depth / 2), fillFn: fillBackFrontFaces },
    { center: $v(0, 0, -depth / 2), fillFn: fillBackFrontFaces },
  ] as const

  const orderedFaces = faces.toSorted(
    (left, right) => transform(right.center).z - transform(left.center).z,
  )

  orderedFaces.forEach(face => face.fillFn(face.center))
}

export const cube = (
  size: number,
  { color = 'gray', lineWidth = 1, opacity = 1 } = {},
) => box(size, size, size, { color, lineWidth, opacity })

export const circleXY = (
  radius: number,
  { color = 'gray', lineWidth = 1 } = {},
) => {
  let previousPoint: Vector | undefined

  for (let theta = 0; theta <= 2 * PI; theta += (2 * PI) / CIRCLE_SEGMENTS) {
    const currentPoint = $v(radius * sin(theta), radius * cos(theta), 0)

    if (previousPoint !== undefined)
      line(previousPoint, currentPoint, { color, lineWidth })

    previousPoint = currentPoint
  }
}

export const sphere = (
  radius: number,
  { color = 'gray', lineWidth = 1, opacity = 1 } = {},
) => {
  isolateTransformations(() => {
    // Draw a series of concentric 2D circles as longitude lines, all with the same radius.
    timesForEach(SPHERE_LONGITUDE_LINES, () => {
      rotateY(PI / SPHERE_LONGITUDE_LINES)

      circleXY(radius, { color, lineWidth })
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

        circleXY(radius * sin(theta), { color, lineWidth })
      })
    }
  })
}

export const text2d = (message: string, point: Vector) => {
  ctx.font = 'bold 60px sans-serif'
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)' // Semi-transparent black
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  const position = transform(point).add(SCREEN_CENTER, false)

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
  line(xNeg, xPos, { color: 'red' })
  point(xPos, { color: 'red', size: 12 })

  // Y-axis
  line(yNeg, yPos, { color: 'green' })
  point(yPos, { color: 'green', size: 12 })

  // Z-axis
  line(zNeg, zPos, { color: 'blue' })
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
