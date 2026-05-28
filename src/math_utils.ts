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
