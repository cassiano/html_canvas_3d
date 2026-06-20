import { $v, Vector3d } from './vector_3d.ts'
import { Tuple } from './utility_types.ts'

export const {
  PI,
  sin,
  cos,
  tan,
  min,
  max,
  sqrt,
  abs,
  acos,
  asin,
  atan,
  sign,
  floor,
  ceil,
} = Math

export const TWO_PI = 2 * PI
export const HALF_PI = PI / 2

export const FULL_CIRCLE_IN_DEGREES = 360

export const radians = (degrees: number) =>
  (degrees / FULL_CIRCLE_IN_DEGREES) * TWO_PI
export const degrees = (radians: number) =>
  (radians / TWO_PI) * FULL_CIRCLE_IN_DEGREES

export const polarToCartesian2d = (radius: number, angle: number) =>
  $v(radius * cos(angle), radius * sin(angle))

export const random = (min = 0, max = 1) => Math.random() * (max - min) + min

export const map = (
  value: number,
  start1: number,
  stop1: number,
  start2: number,
  stop2: number,
  withinBounds = false,
) => {
  if (withinBounds) {
    if (start1 <= stop1) {
      if (value <= start1) return start2
      else if (value >= stop1) return stop2
    } else if (value >= start1) {
      return start2
    } else if (value <= stop1) {
      return stop2
    }
  }

  return ((value - start1) / (stop1 - start1)) * (stop2 - start2) + start2
}

// Standard version.
// export const multiplyMatrices = (
//   leftMatrix: number[][],
//   rightMatrix: number[][],
// ): number[][] => {
//   const colsLeft = leftMatrix[0].length
//   const colsRight = rightMatrix[0].length
//   const rowsLeft = leftMatrix.length
//   const rowsRight = rightMatrix.length

//   if (colsLeft !== rowsRight)
//     throw new Error(
//       `Number of columns from left matrix (${colsLeft}) must match number of rows from right one (${rowsRight})`,
//     )

//   const result: number[][] = []

//   for (let row = 0; row < rowsLeft; row++) {
//     result[row] = []

//     for (let col = 0; col < colsRight; col++) {
//       result[row][col] = 0

//       // colsLeft = rowsRight
//       for (let i = 0; i < colsLeft; i++)
//         result[row][col] += leftMatrix[row][i] * rightMatrix[i][col]
//     }
//   }

//   return result
// }

// Optimized version.
export const multiply4x4Matrices = (
  leftMatrix: Tuple<Tuple<number, 4>, 4>,
  rightMatrix: Tuple<Tuple<number, 4>, 4>,
): Tuple<Tuple<number, 4>, 4> => {
  const [
    [l00, l01, l02, l03],
    [l10, l11, l12, l13],
    [l20, l21, l22, l23],
    [l30, l31, l32, l33],
  ] = leftMatrix
  const [
    [r00, r01, r02, r03],
    [r10, r11, r12, r13],
    [r20, r21, r22, r23],
    [r30, r31, r32, r33],
  ] = rightMatrix

  return [
    [
      l00 * r00 + l01 * r10 + l02 * r20 + l03 * r30,
      l00 * r01 + l01 * r11 + l02 * r21 + l03 * r31,
      l00 * r02 + l01 * r12 + l02 * r22 + l03 * r32,
      l00 * r03 + l01 * r13 + l02 * r23 + l03 * r33,
    ],
    [
      l10 * r00 + l11 * r10 + l12 * r20 + l13 * r30,
      l10 * r01 + l11 * r11 + l12 * r21 + l13 * r31,
      l10 * r02 + l11 * r12 + l12 * r22 + l13 * r32,
      l10 * r03 + l11 * r13 + l12 * r23 + l13 * r33,
    ],
    [
      l20 * r00 + l21 * r10 + l22 * r20 + l23 * r30,
      l20 * r01 + l21 * r11 + l22 * r21 + l23 * r31,
      l20 * r02 + l21 * r12 + l22 * r22 + l23 * r32,
      l20 * r03 + l21 * r13 + l22 * r23 + l23 * r33,
    ],
    [
      l30 * r00 + l31 * r10 + l32 * r20 + l33 * r30,
      l30 * r01 + l31 * r11 + l32 * r21 + l33 * r31,
      l30 * r02 + l31 * r12 + l32 * r22 + l33 * r32,
      l30 * r03 + l31 * r13 + l32 * r23 + l33 * r33,
    ],
  ]
}

export const multiply4x4MatrixBy4dPoint = (
  matrix: number[][],
  point: number[],
): Vector3d => {
  // Notice the matrix's 4th row is not used at all, since the point's 4th dimension will be discarded
  // during the transformation.
  const [[m00, m01, m02, m03], [m10, m11, m12, m13], [m20, m21, m22, m23]] =
    matrix
  const [x, y, z, w] = point

  return $v(
    m00 * x + m01 * y + m02 * z + m03 * w,
    m10 * x + m11 * y + m12 * z + m13 * w,
    m20 * x + m21 * y + m22 * z + m23 * w,
  )
}
