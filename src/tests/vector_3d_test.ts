/// <reference lib="deno.ns" />

// To execute tests, run:
//
// `deno test`
// `deno test --watch`

import {
  assertEquals,
  assertThrows,
  assertAlmostEquals,
  assert,
  assertGreaterOrEqual,
  assertLessOrEqual,
  assertNotStrictEquals,
} from '@std/assert'

import { Vector3d, $v, createVector } from '../vector_3d.ts'
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

  assertEquals(v.toArray(), [10, 20, 30])
})

test('Vector - Clone', () => {
  const v1 = $v(1, 2, 3)
  const v2 = v1.clone()

  assertEquals(v1.toArray(), v2.toArray())
  assertNotStrictEquals(v1, v2) // Ensure it's a different reference
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

test('Vector - normalize() on zero vector throws', () => {
  const v = $v(0, 0, 0)
  assertThrows(
    () => v.normalize(),
    Error,
    'Sorry, but division by 0 is not supported',
  )
})

test('Vector - Heading and setHeading can only be called on 2d vectors', () => {
  const v = $v(1, 2, 3)

  assertThrows(
    () => v.heading(),
    '`heading()` can only be called on 2d vectors',
  )
  assertThrows(
    () => v.setHeading(PI),
    '`setHeading()` can only be called on 2d vectors',
  )
})

test('Vector - Heading', () => {
  const v1 = $v(1, 0)
  const v2 = $v(1, 1)
  const v3 = $v(0, 1)
  const v4 = $v(-1, 1)
  const v5 = $v(-1, 0)

  assertAlmostEquals(v1.heading(), 0)
  assertAlmostEquals(v2.heading(), PI / 4)
  assertAlmostEquals(v3.heading(), HALF_PI)
  assertAlmostEquals(v4.heading(), (3 * PI) / 4)
  assertAlmostEquals(v5.heading(), PI)
})

test('Vector - Heading negative angles', () => {
  const v1 = $v(1, -1) // 4th quadrant
  const v2 = $v(-1, -1) // 3rd quadrant
  const v3 = $v(0, -1) // straight down

  // heading() uses angleBetween (law of cosines), returns [0, PI]
  assertAlmostEquals(v1.heading(), PI / 4)
  assertAlmostEquals(v2.heading(), (3 * PI) / 4)
  assertAlmostEquals(v3.heading(), HALF_PI)
})

test('Vector - setHeading', () => {
  const v1 = $v(1, 0)
  const v1Mag = v1.mag()

  v1.setHeading(0)
  assertEquals(v1.mag(), v1Mag)
  assertAlmostEquals(v1.heading(), 0)

  v1.setHeading(PI / 4)
  assertEquals(v1.mag(), v1Mag)
  assertAlmostEquals(v1.heading(), PI / 4)

  v1.setHeading(HALF_PI)
  assertEquals(v1.mag(), v1Mag)
  assertAlmostEquals(v1.heading(), HALF_PI)

  v1.setHeading((3 * PI) / 4)
  assertEquals(v1.mag(), v1Mag)
  assertAlmostEquals(v1.heading(), (3 * PI) / 4)

  v1.setHeading(PI)
  assertEquals(v1.mag(), v1Mag)
  assertAlmostEquals(v1.heading(), PI)
})

test('Vector - Add (overloads)', () => {
  // Vector overload
  const v1 = $v(1, 1, 1)
  v1.add($v(1, 2, 3))
  assertEquals(v1.toArray(), [1 + 1, 1 + 2, 1 + 3])

  // Scalars overload
  v1.add(1, 1, 1)
  assertEquals(v1.toArray(), [2 + 1, 3 + 1, 4 + 1])
})

test('Vector - Sub (overloads)', () => {
  const v1 = $v(10, 10, 10)
  v1.sub($v(1, 2, 3))
  assertEquals(v1.toArray(), [10 - 1, 10 - 2, 10 - 3])

  v1.sub(1, 1, 1)
  assertEquals(v1.toArray(), [9 - 1, 8 - 1, 7 - 1])
})

test('Vector - Mult and Div', () => {
  const v = $v(1, 2, 3)
  v.mult(2)
  assertEquals(v.toArray(), [1 * 2, 2 * 2, 3 * 2])

  v.div(2)
  assertEquals(v.toArray(), [2 / 2, 4 / 2, 6 / 2])

  assertThrows(
    () => v.div(0),
    Error,
    'Sorry, but division by 0 is not supported',
  )
})

test('Vector - mult(1) and div(1) are no-ops', () => {
  const v = $v(5, 10, 15)
  const ref = v

  v.mult(1)
  assertEquals(v, ref) // same reference (no clone)

  v.div(1)
  assertEquals(v, ref)

  assertEquals(v.toArray(), [5, 10, 15]) // values unchanged
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
  assertEquals(result1.toArray(), [...AXES.z]) // X cross Y = Z

  const result2 = AXES.y.cross(AXES.x)
  assertEquals(result2.toArray(), [...AXES['-z']]) // Y cross X = -Z
})

test('Vector - Cross Product scalar overload', () => {
  const result1 = AXES.x.cross(0, 1, 0)
  assertEquals(result1.toArray(), [...AXES.z]) // X cross Y = Z

  const result2 = AXES.y.cross(0, 0, 1)
  assertEquals(result2.toArray(), [...AXES.x]) // Y cross Z = X
})

test('Vector - Distance', () => {
  const v1 = $v(0, 0, 0)
  const v2 = $v(3, 4, 0)

  assertEquals(v1.dist(v2), 5)
  assertEquals(v1.distSq(v2), 25)

  assertEquals(v2.dist(v1), 5)
  assertEquals(v2.distSq(v1), 25)
})

test('Vector - Distance scalar overloads', () => {
  const v = $v(0, 0, 0)

  assertEquals(v.dist(3, 4, 0), 5)
  assertEquals(v.distSq(3, 4, 0), 25)

  // 2D (z defaults to 0)
  assertEquals(v.dist(1, 2), $v(0, 0, 0).dist($v(1, 2, 0)))
})

// --- manhattanDist Coverage ---

test('Vector - manhattanDist', () => {
  const v = $v(1, 2, 3)

  // Vector overload
  assertEquals(v.manhattanDist($v(4, 6, 8)), 12) // |1-4| + |2-6| + |3-8| = 3+4+5
  assertEquals(v.manhattanDist($v(1, 2, 3)), 0)

  // Scalar overload
  assertEquals(v.manhattanDist(4, 6, 8), 12)

  // 3D with negatives
  assertEquals($v(0, 0, 0).manhattanDist(-1, -2, -3), 6)
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

// --- notEquals Coverage ---

test('Vector - notEquals', () => {
  const v = $v(1, 2, 3)

  // Scalar overload
  assertEquals(v.notEquals(1, 2, 3), false)
  assertEquals(v.notEquals(1, 2, 4), true)

  // Vector overload
  assertEquals(v.notEquals($v(1, 2, 3)), false)
  assertEquals(v.notEquals($v(0, 0, 0)), true)

  // 2D comparison (z defaults to 0)
  assertEquals(v.notEquals(1, 2), true)
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

test('Vector - angleBetween with zero vectors', () => {
  const v = $v(1, 0, 0)

  // Zero vector has mag 0 → division by 0 → NaN
  assertAlmostEquals(v.angleBetween($v(0, 0, 0)), NaN)
  assertAlmostEquals($v(0, 0, 0).angleBetween(v), NaN)

  // Both zero
  assertAlmostEquals($v(0, 0, 0).angleBetween($v(0, 0, 0)), NaN)
})

test('Vector - lerp (Linear intERPolation)', () => {
  const v1 = $v(0, 0, 0)
  const v2 = $v(10, 10, 10)

  // Default ratio 0.5
  const mid = v1.lerp(v2)
  assertEquals(mid.toArray(), [5, 5, 5])

  // Specific ratio 0.2 via Vector
  const low = v1.lerp(v2, 0.2)
  assertEquals(low.toArray(), [2, 2, 2])

  // Specific ratio 0.8 via coordinates
  const high = v1.lerp(10, 10, 10, 0.8)
  assertEquals(high.toArray(), [8, 8, 8])
})

test('Vector - lerp edge cases', () => {
  const v1 = $v(0, 0, 0)
  const v2 = $v(10, 10, 10)

  // Ratio 0 → original
  assertEquals(v1.lerp(v2, 0).toArray(), [0, 0, 0])

  // Ratio 1 → target
  assertEquals(v1.lerp(v2, 1).toArray(), [10, 10, 10])

  // Negative ratio
  assertEquals(v1.lerp(v2, -0.5).toArray(), [-5, -5, -5])

  // Ratio > 1
  assertEquals(v1.lerp(v2, 1.5).toArray(), [15, 15, 15])
})

test('Vector - Iterator and Serialization', () => {
  const v = $v(1, 2, 3)

  // Iterator
  const collected = v.toArray()
  assertEquals(collected, [1, 2, 3])

  // toArray
  assertEquals(v.toArray(), [1, 2, 3])

  // toString
  assertEquals(v.toString(), '[1,2,3]')
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

  assertEquals(v.toArray(), [1, 2, 3])
  assertEquals(v.x, 1)
  assertEquals(v.y, 2)
  assertEquals(v.z, 3)
})

test('Vector - Chainable setters (setX, setY, setZ)', () => {
  const v = $v(0, 0, 0)
  const result = v.setX(1).setY(2).setZ(3)

  assertEquals(v.toArray(), [1, 2, 3])
  assertEquals(result, v) // same instance

  // Verify return values are `this`
  assertEquals(v.setX(5), v)
  assertEquals(v.setY(5), v)
  assertEquals(v.setZ(5), v)
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
  assertEquals(v.toArray(), [1, 1, 1])
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

test('Vector - Static random methods with default options', () => {
  const v1 = Vector3d.random2d()

  assertAlmostEquals(v1.mag(), 1)

  assertGreaterOrEqual(v1.x, -1)
  assertGreaterOrEqual(v1.y, -1)
  assertEquals(v1.z, 0)

  assertLessOrEqual(v1.x, 1)
  assertLessOrEqual(v1.y, 1)

  const v2 = Vector3d.random3d()

  assertAlmostEquals(v2.mag(), 1)

  assertGreaterOrEqual(v2.x, -1)
  assertGreaterOrEqual(v2.y, -1)
  assertGreaterOrEqual(v2.z, -1)

  assertLessOrEqual(v2.x, 1)
  assertLessOrEqual(v2.y, 1)
  assertLessOrEqual(v2.z, 1)
})
