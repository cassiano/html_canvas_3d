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
} = Math

export const radians = (degrees: number) => (degrees / 360) * (2 * PI)
export const degrees = (radians: number) => (radians / (2 * PI)) * 360

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
  const [
    [m00, m01, m02, m03],
    [m10, m11, m12, m13],
    [m20, m21, m22, m23],
    [_m30, _m31, _m32, _m33], // Not used.
  ] = matrix
  const [p0, p1, p2, p3] = point

  return $v(
    m00 * p0 + m01 * p1 + m02 * p2 + m03 * p3,
    m10 * p0 + m11 * p1 + m12 * p2 + m13 * p3,
    m20 * p0 + m21 * p1 + m22 * p2 + m23 * p3,
  )
}

// export const multiply4x4MatrixBy4dPoint = (
//   matrix: Tuple<Tuple<number, 4>, 4>,
//   point: Tuple<number, 4>,
// ): Vector3d => {
//   const [row0, row1, row2] = matrix
//   const [point0, point1, point2, point3] = point

//   return $v(
//     row0[0] * point0 + row0[1] * point1 + row0[2] * point2 + row0[3] * point3,
//     row1[0] * point0 + row1[1] * point1 + row1[2] * point2 + row1[3] * point3,
//     row2[0] * point0 + row2[1] * point1 + row2[2] * point2 + row2[3] * point3,
//   )
// }
