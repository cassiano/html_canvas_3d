/// <reference lib="deno.ns" />

import {
  assert,
  assertAlmostEquals,
  assertEquals,
  assertThrows,
} from '@std/assert'

import {
  cartesianToPolar2d,
  degrees,
  FULL_CIRCLE_IN_DEGREES,
  HALF_PI,
  map,
  multiply4x4Matrices,
  multiply4x4MatrixBy4dPoint,
  multiplyMatrices,
  PI,
  polarToCartesian2d,
  radians,
  random,
  TWO_PI,
} from '../math_utils.ts'
import { $v } from '../vector_3d.ts'
import { Tuple } from '../utility_types.ts'

/**
 * Alias for `Deno.test`, used to register the test cases in this file.
 */
const test = Deno.test

/**
 * Verifies that the re-exported angle constants hold their usual values.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Math utils - Angle constants', () => {
  assertEquals(PI, Math.PI)
  assertEquals(TWO_PI, 2 * Math.PI)
  assertEquals(HALF_PI, Math.PI / 2)
  assertEquals(FULL_CIRCLE_IN_DEGREES, 360)
})

/**
 * Verifies that `radians()` and `degrees()` convert between the two angle
 * units.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Math utils - radians() and degrees()', () => {
  assertAlmostEquals(radians(180), PI)
  assertAlmostEquals(radians(360), TWO_PI)
  assertAlmostEquals(radians(90), HALF_PI)
  assertAlmostEquals(radians(0), 0)

  assertAlmostEquals(degrees(PI), 180)
  assertAlmostEquals(degrees(TWO_PI), 360)
  assertAlmostEquals(degrees(HALF_PI), 90)
  assertAlmostEquals(degrees(0), 0)
})

/**
 * Verifies that `radians()` and `degrees()` are inverses of each other.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Math utils - radians() and degrees() round trip', () => {
  const angles = [0, 45, 90, 180, 270, 360, -90]

  angles.forEach(angle => {
    assertAlmostEquals(degrees(radians(angle)), angle)
  })
})

/**
 * Verifies that `random()` produces numbers within the requested range, and
 * that it honours its default arguments.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Math utils - random()', () => {
  for (let i = 0; i < 200; i++) {
    const value = random(10, 20)

    assert(value >= 10 && value < 20)
  }

  for (let i = 0; i < 200; i++) {
    const value = random()

    assert(value >= 0 && value < 1)
  }

  for (let i = 0; i < 200; i++) {
    const value = random(-5)

    assert(value >= -5 && value < 1)
  }
})

/**
 * Verifies that `map()` re-maps a number from one range onto another.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Math utils - map() without bounds', () => {
  assertEquals(map(5, 0, 10, 0, 100), 50)
  assertEquals(map(0, 0, 10, 20, 30), 20)
  assertEquals(map(10, 0, 10, 20, 30), 30)
  assertEquals(map(5, 0, 10, 0, 1), 0.5)

  // Values outside the source range are extrapolated.
  assertEquals(map(20, 0, 10, 0, 100), 200)
  assertEquals(map(-10, 0, 10, 0, 100), -100)
})

/**
 * Verifies that `map()` clamps the result when `withinBounds` is enabled.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Math utils - map() with bounds', () => {
  assertEquals(map(5, 0, 10, 0, 100, true), 50)
  assertEquals(map(-10, 0, 10, 0, 100, true), 0)
  assertEquals(map(20, 0, 10, 0, 100, true), 100)
  assertEquals(map(0, 0, 10, 20, 30, true), 20)
  assertEquals(map(10, 0, 10, 20, 30, true), 30)
})

/**
 * Verifies that `map()` clamps the result of a descending source range.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Math utils - map() with a descending source range', () => {
  assertEquals(map(10, 10, 0, 0, 100), 0)
  assertEquals(map(0, 10, 0, 0, 100), 100)

  assertEquals(map(20, 10, 0, 0, 100, true), 0)
  assertEquals(map(-10, 10, 0, 0, 100, true), 100)
})

/**
 * Verifies that `multiplyMatrices()` computes the matrix product.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Math utils - multiplyMatrices()', () => {
  const left = [
    [1, 2],
    [3, 4],
  ]
  const right = [
    [5, 6],
    [7, 8],
  ]

  assertEquals(multiplyMatrices(left, right), [
    [19, 22],
    [43, 50],
  ])
})

/**
 * Verifies that `multiplyMatrices()` rejects matrices with incompatible
 * dimensions.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Math utils - multiplyMatrices() throws on mismatched dimensions', () => {
  const left = [
    [1, 2],
    [3, 4],
  ]
  const right = [
    [1, 2, 3],
    [4, 5, 6],
    [7, 8, 9],
  ]

  assertThrows(
    () => multiplyMatrices(left, right),
    Error,
    'Number of columns from left matrix (2) must match number of rows from right one (3)',
  )
})

/**
 * Verifies that `multiply4x4Matrices()` computes the product of two 4x4
 * matrices and leaves its operands untouched.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Math utils - multiply4x4Matrices()', () => {
  const identity: Tuple<Tuple<number, 4>, 4> = [
    [1, 0, 0, 0],
    [0, 1, 0, 0],
    [0, 0, 1, 0],
    [0, 0, 0, 1],
  ]

  const translation: Tuple<Tuple<number, 4>, 4> = [
    [1, 0, 0, 10],
    [0, 1, 0, 20],
    [0, 0, 1, 30],
    [0, 0, 0, 1],
  ]

  assertEquals(multiply4x4Matrices(identity, identity), identity)
  assertEquals(multiply4x4Matrices(identity, translation), translation)
  assertEquals(multiply4x4Matrices(translation, identity), translation)

  // The product of two translations adds both offsets.
  const composed = multiply4x4Matrices(translation, translation)

  assertEquals(composed[0][3], 20)
  assertEquals(composed[1][3], 40)
  assertEquals(composed[2][3], 60)
  assertEquals(composed[3][3], 1)

  // The operands are not modified.
  assertEquals(translation[0][3], 10)
})

/**
 * Verifies that `multiply4x4MatrixBy4dPoint()` transforms a 4D point and
 * discards the resulting fourth coordinate.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Math utils - multiply4x4MatrixBy4dPoint()', () => {
  const identity = [
    [1, 0, 0, 0],
    [0, 1, 0, 0],
    [0, 0, 1, 0],
    [0, 0, 0, 1],
  ]

  assertEquals(multiply4x4MatrixBy4dPoint(identity, [1, 2, 3, 1]), [1, 2, 3])

  const translation = [
    [1, 0, 0, 10],
    [0, 1, 0, 20],
    [0, 0, 1, 30],
    [0, 0, 0, 1],
  ]

  assertEquals(
    multiply4x4MatrixBy4dPoint(translation, [1, 2, 3, 1]),
    [11, 22, 33],
  )
})

/**
 * Verifies that `multiply4x4MatrixBy4dPoint()` ignores the matrix's fourth
 * row, since the point's fourth coordinate is discarded.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Math utils - multiply4x4MatrixBy4dPoint() ignores the fourth row', () => {
  const matrix = [
    [1, 0, 0, 0],
    [0, 1, 0, 0],
    [0, 0, 1, 0],
    [9, 9, 9, 9],
  ]

  assertEquals(multiply4x4MatrixBy4dPoint(matrix, [1, 2, 3, 1]), [1, 2, 3])
})

/**
 * Verifies that `polarToCartesian2d()` converts polar coordinates into
 * Cartesian ones on the XY-plane.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Math utils - polarToCartesian2d()', () => {
  assertAlmostEquals(polarToCartesian2d(1, 0).x, 1)
  assertAlmostEquals(polarToCartesian2d(1, 0).y, 0, 1e-9)

  assertAlmostEquals(polarToCartesian2d(2, HALF_PI).x, 0, 1e-9)
  assertAlmostEquals(polarToCartesian2d(2, HALF_PI).y, 2)

  assertAlmostEquals(polarToCartesian2d(3, PI).x, -3)
  assertAlmostEquals(polarToCartesian2d(3, PI).y, 0, 1e-9)

  assertAlmostEquals(polarToCartesian2d(5, PI / 4).mag(), 5)
})

/**
 * Verifies that `cartesianToPolar2d()` converts Cartesian coordinates into
 * polar ones, for both of its overloads.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Math utils - cartesianToPolar2d()', () => {
  const [radius, angle] = cartesianToPolar2d(3, 4)

  assertAlmostEquals(radius, 5)
  assertAlmostEquals(angle, Math.atan2(4, 3))

  const [vectorRadius, vectorAngle] = cartesianToPolar2d($v(0, 2))

  assertAlmostEquals(vectorRadius, 2)
  assertAlmostEquals(vectorAngle, HALF_PI)
})

/**
 * Verifies that `cartesianToPolar2d()` rejects vectors that are not
 * two-dimensional.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Math utils - cartesianToPolar2d() throws for 3d vectors', () => {
  assertThrows(
    () => cartesianToPolar2d($v(1, 2, 3)),
    Error,
    '`heading()` can only be called on 2d vectors',
  )
})
