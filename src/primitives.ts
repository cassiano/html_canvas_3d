import {
  SCREEN_Z_DISTANCE,
  SPHERE_LATITUDE_LINES,
  SPHERE_LONGITUDE_LINES,
} from './constants.ts'
import { $v, Vector } from './vector.ts'
import { Tuple } from './utility_types.ts'
import { cos, min, PI, sin, timesForEach } from './util.ts'

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
  // ȋ   ĵ  k̂  (w)
    [1,  0, 0, 0],
    [0, -1, 0, 0],
    [0,  0, 1, 0],
    [0,  0, 0, 1],
  ] as const

export let transformationMatrix: transformationMatrix4x4Type
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
        ? $v(xOrXyzOrVector, y, z) // 1st signature.
        : $v(xOrXyzOrVector, xOrXyzOrVector, xOrXyzOrVector) // 2nd signature.
      : xOrXyzOrVector // 3rd signature.

  transformationMatrix = multiplyMatrices(
    transformationMatrix,
    // prettier-ignore
    [
    // ȋ          ĵ         k̂         (w)
      [vector.x,  0,        0,        0],
      [0,         vector.y, 0,        0],
      [0,         0,        vector.z, 0],
      [0,         0,        0,        1],
    ],
  ) as transformationMatrix4x4Type
}

interface TranslateOverloadedSignatures {
  (x: number, y: number, z: number): void
  (vector: Vector): void
}

export const translate: TranslateOverloadedSignatures = (
  xOrVector: number | Vector,
  y?: number,
  z?: number,
) => {
  const vector =
    typeof xOrVector === 'number' ? $v(xOrVector, y!, z) : xOrVector

  transformationMatrix = multiplyMatrices(
    transformationMatrix,
    // prettier-ignore
    [
    // ȋ  ĵ  k̂  (w)
      [1, 0, 0, vector.x],
      [0, 1, 0, vector.y],
      [0, 0, 1, vector.z],
      [0, 0, 0, 1],
    ],
  ) as transformationMatrix4x4Type
}

export const rotate = (angle: number, axis: Vector) => {}

export const rotateX = (xAngle: number) => {
  if (xAngle === 0) return

  transformationMatrix = multiplyMatrices(
    transformationMatrix,
    // prettier-ignore
    [
    // ȋ  ĵ             k̂            (w)
      [1, 0,            0,           0],
      [0, cos(xAngle), -sin(xAngle), 0],
      [0, sin(xAngle),  cos(xAngle), 0],
      [0, 0,            0,           1],
    ],
  ) as transformationMatrix4x4Type
}

export const rotateY = (yAngle: number) => {
  if (yAngle === 0) return

  transformationMatrix = multiplyMatrices(
    transformationMatrix,
    // prettier-ignore
    [
    // ȋ            ĵ   k̂             (w)
      [cos(yAngle), 0, -sin(yAngle),  0],
      [0,           1,  0,            0],
      [sin(yAngle), 0,  cos(yAngle),  0],
      [0,           0,  0,            1],
    ],
  ) as transformationMatrix4x4Type
}

export const rotateZ = (zAngle: number) => {
  if (zAngle === 0) return

  transformationMatrix = multiplyMatrices(
    transformationMatrix,
    // prettier-ignore
    [
    // ȋ             ĵ            k̂  (w)
      [cos(zAngle), -sin(zAngle), 0, 0],
      [sin(zAngle),  cos(zAngle), 0, 0],
      [0,            0,           1, 0],
      [0,            0,           0, 1],
    ],
  ) as transformationMatrix4x4Type
}

export const background = (color: string) => {
  ctx.fillStyle = color
  ctx.fillRect(0, 0, animation.width, animation.height)
}

export const project3dTo2d = ({ x, y, z }: Vector) => {
  const focalLength = SCREEN_Z_DISTANCE
  const divisor = z + focalLength // Object should be at z=0 or higher

  // If the point is behind the camera or exactly on the lens,
  // we return null so the renderer knows to skip it.
  if (divisor <= 0) return

  // Standard perspective: (coord * focalLength) / (z + focalLength)
  return $v((x * focalLength) / divisor, (y * focalLength) / divisor)
}

export const centralize = (point?: Vector) => point?.clone().add(SCREEN_CENTER)

export const transform = (point: Vector) => {
  // Notice that a 4x4 matrix multiplied by a 4x1 vector results in another 4x1 vector.
  // Also notice that we use Post-multiplication. See https://aistudio.google.com/app/prompts?state=%7B%22ids%22:%5B%221k6P5M79qGEqAjs7Wp_-21Jqwgzl8_Z6l%22%5D,%22action%22:%22open%22,%22userId%22:%22113757018662815530084%22,%22resourceKeys%22:%7B%7D%7D&usp=sharing
  const transformedPoint = multiplyMatrices(
    transformationMatrix,
    point.to4dMatrix(),
  ) as transformationMatrix4x4Type

  return Vector.from4dMatrix(transformedPoint)
}

export const point = (coords: Vector, { color = 'black', size = 1 } = {}) => {
  const projected = centralize(project3dTo2d(transform(coords)))

  // Skip rendering if behind camera.
  if (!projected) return

  ctx.fillStyle = color
  ctx.fillRect(projected.x - size / 2, projected.y - size / 2, size, size)
}

export const line = (
  pointA: Vector,
  pointB: Vector,
  { color = 'black', width = 1 } = {},
) => {
  const projectedA = centralize(project3dTo2d(transform(pointA)))
  const projectedB = centralize(project3dTo2d(transform(pointB)))

  // If either point is behind the camera, skip the line. (In advanced engines, you'd "clip" the
  // line at the Z-boundary, but skipping is enough to stop the "random lines").
  if (!projectedA || !projectedB) return

  ctx.strokeStyle = color
  ctx.lineWidth = width
  ctx.beginPath()
  ctx.moveTo(projectedA.x, projectedA.y)
  ctx.lineTo(projectedB.x, projectedB.y)
  ctx.stroke()
}

export const planeXY = (center: Vector, width: number, depth: number) =>
  box(center, width, depth, 0)
export const planeXZ = (center: Vector, width: number, depth: number) =>
  box(center, width, 0, depth)
export const planeYZ = (center: Vector, width: number, depth: number) =>
  box(center, 0, width, depth)

export const box = (
  center: Vector,
  xSize: number,
  ySize: number,
  zSize: number,
  { color = 'gray', width = 1 } = {},
) => {
  const vertices = [
    $v(xSize, ySize, zSize),
    $v(xSize, ySize, -zSize),
    $v(xSize, -ySize, -zSize),
    $v(xSize, -ySize, zSize),
    $v(-xSize, ySize, zSize),
    $v(-xSize, ySize, -zSize),
    $v(-xSize, -ySize, -zSize),
    $v(-xSize, -ySize, zSize),
  ]

  const connections = [
    [0, 1, 2, 3], // front face
    [4, 5, 6, 7], // back face
    // connecting lines
    [0, 4],
    [1, 5],
    [2, 6],
    [3, 7],
    // [0, 6],
    // [1, 7],
    // [2, 4],
    // [3, 5],
    // [0, 5],
    // [1, 4],
    // [2, 7],
    // [3, 6],
  ]

  isolateTransformations(() => {
    translate(center)

    connections.forEach(connection => {
      for (let i = 0; i < connection.length; i++) {
        if (connection.length === 2 && i === 1) continue // handle the simple lines

        const v1 = vertices[connection[i]]
        const v2 = vertices[connection[(i + 1) % connection.length]]

        line(v1, v2, { color, width })
      }
    })
  })
}

export const cube = (
  center: Vector,
  size: number,
  { color = 'gray', width = 1 } = {},
) => box(center, size, size, size, { color, width })

export const circleXY = (
  radius: number,
  { color = 'gray', width = 1 } = {},
) => {
  let previousPoint: Vector | undefined

  for (let theta = 0; theta <= 2 * PI; theta += (2 * PI) / 72) {
    const currentPoint = $v(radius * sin(theta), radius * cos(theta), 0)

    if (previousPoint !== undefined)
      line(previousPoint, currentPoint, { color, width })

    previousPoint = currentPoint
  }
}

export const sphere = (
  center: Vector,
  radius: number,
  { color = 'gray', width = 1 } = {},
) => {
  isolateTransformations(() => {
    translate(center)

    // Draw a series of concentric 2D circles as longitude lines.
    timesForEach(SPHERE_LONGITUDE_LINES, () => {
      rotateY(PI / SPHERE_LONGITUDE_LINES)

      circleXY(radius, { color, width })
    })

    // Draw a series of concentric 2D circles as latitude lines.
    for (
      let theta = 0;
      theta <= PI;
      theta += PI / (SPHERE_LATITUDE_LINES + 1)
    ) {
      isolateTransformations(() => {
        translate(0, radius * cos(theta), 0)
        rotateX(PI / 2)
        circleXY(radius * sin(theta), { color, width })
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
