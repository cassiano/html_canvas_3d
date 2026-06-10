/// <reference lib="deno.ns" />

// To execute tests, run:
//
// `deno test`
// `deno test --watch`

import {
  assertEquals,
  assertNotEquals,
  assertThrows,
  assertAlmostEquals,
  assert,
} from '@std/assert'

import {
  Vector3d,
  $v,
  createVector,
  FOURTH_DIMENSION_COORD,
  transformationMatrix4x1Type,
} from '../vector_3d.ts'
import { PI, HALF_PI } from '../math_utils.ts'
import { AXES } from '../constants.ts'

const test = Deno.test

test('Vector - Constructor and Getters/Setters', () => {
  const v = new Vector3d(1, 2, 3)
  assertEquals(v.x, 1)
  assertEquals(v.y, 2)
  assertEquals(v.z, 3)

  v.x = 10
  v.y = 20
  v.z = 30
  assertEquals(v.coords, [10, 20, 30])
})

test('Vector - Clone', () => {
  const v1 = $v(1, 2, 3)
  const v2 = v1.clone()

  assertEquals(v1.coords, v2.coords)
  assertNotEquals(v1, v2) // Ensure it's a different reference
})

test('Vector - Magnitude calculations', () => {
  const v = $v(3, 4, 0)

  assertEquals(v.magSq(), 25)
  assertEquals(v.mag(), 5)
})

test('Vector - Normalize and setMag', () => {
  const v = $v(10, 0, 0)

  v.normalize()
  assertEquals(v.x, 1)
  assertEquals(v.mag(), 1)

  v.setMag(5)
  assertEquals(v.x, 5)
  assertEquals(v.mag(), 5)
})

test('Vector - Add (overloads)', () => {
  // Vector overload
  const v1 = $v(1, 1, 1)
  v1.add($v(1, 2, 3))
  assertEquals(v1.coords, [1 + 1, 1 + 2, 1 + 3])

  // Scalars overload
  v1.add(1, 1, 1)
  assertEquals(v1.coords, [2 + 1, 3 + 1, 4 + 1])
})

test('Vector - Sub (overloads)', () => {
  const v1 = $v(10, 10, 10)
  v1.sub($v(1, 2, 3))
  assertEquals(v1.coords, [10 - 1, 10 - 2, 10 - 3])

  v1.sub(1, 1, 1)
  assertEquals(v1.coords, [9 - 1, 8 - 1, 7 - 1])
})

test('Vector - Mult and Div', () => {
  const v = $v(1, 2, 3)
  v.mult(2)
  assertEquals(v.coords, [1 * 2, 2 * 2, 3 * 2])

  v.div(2)
  assertEquals(v.coords, [2 / 2, 4 / 2, 6 / 2])

  assertThrows(
    () => v.div(0),
    Error,
    'Sorry, but division by 0 is not supported',
  )
})

test('Vector - Dot Product', () => {
  const v1 = $v(1, 2, 3)
  const v2 = $v(4, 5, 6)

  assertEquals(v1.dot(v2), 1 * 4 + 2 * 5 + 3 * 6) // 32
  assertEquals(v1.dot(4, 5, 6), 1 * 4 + 2 * 5 + 3 * 6) // 32

  assertEquals(v2.dot(v1), 1 * 4 + 2 * 5 + 3 * 6) // 32
  assertEquals(v2.dot(1, 2, 3), 1 * 4 + 2 * 5 + 3 * 6) // 32
})

test('Vector - Cross Product', () => {
  const result1 = AXES.x.cross(AXES.y)
  assertEquals(result1.coords, AXES.z.coords) // X cross Y = Z

  const result2 = AXES.y.cross(AXES.x)
  assertEquals(result2.coords, AXES['-z'].coords) // Y cross X = -Z
})

test('Vector - Distance', () => {
  const v1 = $v(0, 0, 0)
  const v2 = $v(3, 4, 0)

  assertEquals(v1.dist(v2), 5)
  assertEquals(v1.distSq(v2), 25)

  assertEquals(v2.dist(v1), 5)
  assertEquals(v2.distSq(v1), 25)
})

test('Vector - Equality and Helpers', () => {
  const v = $v(1, 1, 1)

  assertEquals(v.equals(1, 1, 1), true)
  assertEquals(v.equals($v(1, 1, 1)), true)

  assertEquals(v.isAllOnes(), true)
  assertEquals(v.isAllZeros(), false)

  const zero = $v(0, 0, 0)
  assertEquals(zero.isAllZeros(), true)
})

test('Vector - 4D Matrix conversion', () => {
  const v = $v(5, 10, 15)
  const matrix = v.to4dMatrix() as transformationMatrix4x1Type
  assertEquals(matrix, [[5], [10], [15], [1]])

  const fromMat = Vector3d.from4dMatrix(matrix)
  assertEquals(fromMat.coords, [5, 10, 15])
})

test('Vector - AngleBetween', () => {
  const v1 = $v(1, 0, 0)
  const v2 = $v(0, 1, 0)
  const angle = v1.angleBetween(v2)

  // Angle between X and Y axis is PI/2 (90ᴼ)
  assertAlmostEquals(angle, HALF_PI)

  assertAlmostEquals(v1.angleBetween(0, 1, 0), HALF_PI)
  assertAlmostEquals(v1.angleBetween($v(0, 1, 0)), HALF_PI)

  // Angle between same vector should be 0
  assertAlmostEquals(v1.angleBetween(1, 0, 0), 0)

  // Angle between opposite vectors should be PI
  assertAlmostEquals(v1.angleBetween(v1.clone().mult(-1)), PI)
})

test('Vector - lerp (Linear intERPolation)', () => {
  const v1 = $v(0, 0, 0)
  const v2 = $v(10, 10, 10)

  // Default ratio 0.5
  const mid = v1.lerp(v2)
  assertEquals(mid.coords, [5, 5, 5])

  // Specific ratio 0.2 via Vector
  const low = v1.lerp(v2, 0.2)
  assertEquals(low.coords, [2, 2, 2])

  // Specific ratio 0.8 via coordinates
  const high = v1.lerp(10, 10, 10, 0.8)
  assertEquals(high.coords, [8, 8, 8])
})

test('Vector - Iterator and Serialization', () => {
  const v = $v(1, 2, 3)

  // Iterator
  const collected = [...v]
  assertEquals(collected, [1, 2, 3])

  // toArray
  assertEquals(v.toArray(), [1, 2, 3])

  // toString
  assertEquals(v.toString(), '[1,2,3]')
})

// --- Constants Coverage ---

test('Constants - FOURTH_DIMENSION_COORD', () => {
  assertEquals(FOURTH_DIMENSION_COORD, 1)
})

test('Constants - AXES values', () => {
  assert(AXES.x.equals(1, 0, 0))
  assert(AXES.y.equals(0, 1, 0))
  assert(AXES.z.equals(0, 0, 1))
  assert(AXES['-x'].equals(-1, 0, 0))
  assert(AXES['-y'].equals(0, -1, 0))
  assert(AXES['-z'].equals(0, 0, -1))
})

// --- Constructor & Factory Coverage ---

test('Vector - Constructor defaults', () => {
  const v = new Vector3d(5, 10)

  assertEquals(v.z, 0, 'z should default to 0')
})

test('Vector - Factory Aliases', () => {
  const v1 = $v(1, 2, 3)
  const v2 = createVector(1, 2, 3)

  assert(v1.equals(v2))
})

// --- Property Accessors Coverage ---

test('Vector - Getters and Setters', () => {
  const v = $v(0, 0, 0)
  v.x = 1
  v.y = 2
  v.z = 3

  assertEquals(v.coords, [1, 2, 3])
  assertEquals(v.x, 1)
  assertEquals(v.y, 2)
  assertEquals(v.z, 3)
})

// --- Arithmetic & Chainability ---

test('Vector - Method Chaining (Fluent API)', () => {
  const v = $v(1, 1, 1)

  // add, sub, mult, div, setMag, normalize all return 'this'
  const result = v
    .add(1, 1, 1)
    .mult(2)
    .sub($v(1, 1, 1))
    .div(3)

  assertEquals(v, result, 'Methods should return the same instance')
  assertEquals(v.coords, [1, 1, 1])
})

// --- Utilities & Symbols Coverage ---

test('Vector - Iterator protocol', () => {
  const v = $v(7, 8, 9)
  const results: number[] = []

  for (const coord of v) results.push(coord)

  assertEquals(results, [7, 8, 9])

  const [x, y, z] = v
  assertEquals(x, 7)
  assertEquals(y, 8)
  assertEquals(z, 9)
})

test('Vector - clone is deep enough', () => {
  const v1 = $v(1, 1, 1)
  const v2 = v1.clone()
  v1.x = 5

  assertEquals(v2.x, 1, 'Cloned vector should not change when original changes')
})
