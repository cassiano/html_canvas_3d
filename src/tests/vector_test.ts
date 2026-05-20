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
  Vector,
  $v,
  createVector,
  AXES,
  FOURTH_DIMENSION_COORD,
  transformationMatrix4x1Type,
} from '../vector.ts'

Deno.test('Vector - Constructor and Getters/Setters', () => {
  const v = new Vector(1, 2, 3)
  assertEquals(v.x, 1)
  assertEquals(v.y, 2)
  assertEquals(v.z, 3)

  v.x = 10
  v.y = 20
  v.z = 30
  assertEquals(v.coords, [10, 20, 30])
})

Deno.test('Vector - Clone', () => {
  const v1 = $v(1, 2, 3)
  const v2 = v1.clone()
  assertEquals(v1.coords, v2.coords)
  assertNotEquals(v1, v2) // Ensure it's a different reference
})

Deno.test('Vector - Magnitude calculations', () => {
  const v = $v(3, 4, 0)
  assertEquals(v.magSq(), 25)
  assertEquals(v.mag(), 5)
})

Deno.test('Vector - Normalize and setMag', () => {
  const v = $v(10, 0, 0)
  v.normalize()
  assertEquals(v.x, 1)
  assertEquals(v.mag(), 1)

  v.setMag(5)
  assertEquals(v.x, 5)
  assertEquals(v.mag(), 5)
})

Deno.test('Vector - Add (overloads)', () => {
  // Vector overload
  const v1 = $v(1, 1, 1)
  v1.add($v(1, 2, 3))
  assertEquals(v1.coords, [2, 3, 4])

  // Scalars overload
  v1.add(1, 1, 1)
  assertEquals(v1.coords, [3, 4, 5])
})

Deno.test('Vector - Sub (overloads)', () => {
  const v1 = $v(10, 10, 10)
  v1.sub($v(1, 2, 3))
  assertEquals(v1.coords, [9, 8, 7])

  v1.sub(1, 1, 1)
  assertEquals(v1.coords, [8, 7, 6])
})

Deno.test('Vector - Mult and Div', () => {
  const v = $v(1, 2, 3)
  v.mult(2)
  assertEquals(v.coords, [2, 4, 6])

  v.div(2)
  assertEquals(v.coords, [1, 2, 3])

  assertThrows(() => v.div(0), Error, 'division by 0 is not supported')
})

Deno.test('Vector - Dot Product', () => {
  const v1 = $v(1, 2, 3)
  const v2 = $v(4, 5, 6)
  // (1*4) + (2*5) + (3*6) = 4 + 10 + 18 = 32
  assertEquals(v1.dot(v2), 32)
  assertEquals(v1.dot(4, 5, 6), 32)
})

Deno.test('Vector - Cross Product', () => {
  const v1 = AXES.x // (1, 0, 0)
  const v2 = AXES.y // (0, 1, 0)
  const result = v1.cross(v2)

  assertEquals(result.coords, [0, 0, 1]) // X cross Y = Z
})

Deno.test('Vector - Distance', () => {
  const v1 = $v(0, 0, 0)
  const v2 = $v(3, 4, 0)
  assertEquals(v1.dist(v2), 5)
  assertEquals(v1.distSq(v2), 25)
})

Deno.test('Vector - Equality and Helpers', () => {
  const v = $v(1, 1, 1)
  assertEquals(v.equals(1, 1, 1), true)
  assertEquals(v.isAllOnes(), true)
  assertEquals(v.isAllZeros(), false)

  const zero = $v(0, 0, 0)
  assertEquals(zero.isAllZeros(), true)
})

Deno.test('Vector - 4D Matrix conversion', () => {
  const v = $v(5, 10, 15)
  const matrix = v.to4dMatrix() as transformationMatrix4x1Type
  assertEquals(matrix, [[5], [10], [15], [1]])

  const fromMat = Vector.from4dMatrix(matrix)
  assertEquals(fromMat.coords, [5, 10, 15])
})

Deno.test('Vector - AngleBetween', () => {
  const v1 = $v(1, 0, 0)
  const v2 = $v(0, 1, 0)
  const angle = v1.angleBetween(v2)

  // Angle between X and Y axis is PI/2 (90 degrees)
  assertAlmostEquals(angle, Math.PI / 2)
})

Deno.test('Vector - InBetween (LERP)', () => {
  const v1 = $v(0, 0, 0)
  const v2 = $v(10, 10, 10)

  // Default ratio 0.5
  const mid = v1.inBetween(v2)
  assertEquals(mid.coords, [5, 5, 5])

  // Specific ratio 0.2 via Vector
  const low = v1.inBetween(v2, 0.2)
  assertEquals(low.coords, [2, 2, 2])

  // Specific ratio 0.8 via coordinates
  const high = v1.inBetween(10, 10, 10, 0.8)
  assertEquals(high.coords, [8, 8, 8])
})

Deno.test('Vector - Iterator and Serialization', () => {
  const v = $v(1, 2, 3)

  // Iterator
  const collected = [...v]
  assertEquals(collected, [1, 2, 3])

  // toArray
  assertEquals(v.toArray(), [1, 2, 3])

  // toString
  assertEquals(v.toString(), '[1,2,3]')
})

Deno.test('Vector - Static AXES constants', () => {
  assertEquals(AXES.x.coords, [1, 0, 0])
  assertEquals(AXES.y.coords, [0, 1, 0])
  assertEquals(AXES.z.coords, [0, 0, 1])
  assertEquals(AXES['-x'].coords, [-1, 0, 0])
})

// --- Constants Coverage ---

Deno.test('Constants - FOURTH_DIMENSION_COORD', () => {
  assertEquals(FOURTH_DIMENSION_COORD, 1)
})

Deno.test('Constants - AXES values', () => {
  assert(AXES.x.equals(1, 0, 0))
  assert(AXES.y.equals(0, 1, 0))
  assert(AXES.z.equals(0, 0, 1))
  assert(AXES['-x'].equals(-1, 0, 0))
  assert(AXES['-y'].equals(0, -1, 0))
  assert(AXES['-z'].equals(0, 0, -1))
})

// --- Constructor & Factory Coverage ---

Deno.test('Vector - Constructor defaults', () => {
  const v = new Vector(5, 10)
  assertEquals(v.z, 0, 'z should default to 0')
})

Deno.test('Vector - Factory Aliases', () => {
  const v1 = $v(1, 2, 3)
  const v2 = createVector(1, 2, 3)
  assert(v1.equals(v2))
})

// --- Property Accessors Coverage ---

Deno.test('Vector - Getters and Setters', () => {
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

Deno.test('Vector - Method Chaining (Fluent API)', () => {
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

Deno.test('Vector - add/sub overloads', () => {
  const v = $v(1, 2, 3)
  v.add(1, 1, 1) // numbers
  assertEquals(v.coords, [2, 3, 4])
  v.add($v(1, 1, 1)) // vector
  assertEquals(v.coords, [3, 4, 5])

  v.sub(1, 1, 1)
  assertEquals(v.coords, [2, 3, 4])
  v.sub($v(1, 1, 1))
  assertEquals(v.coords, [1, 2, 3])
})

// --- Math & Geometry Coverage ---

Deno.test('Vector - mag and magSq', () => {
  const v = $v(0, 3, 4)
  assertEquals(v.magSq(), 25)
  assertEquals(v.mag(), 5)
})

Deno.test('Vector - normalize handles zero vector', () => {
  const v = $v(0, 0, 0)
  // normalize calls div(mag), which is div(0)
  assertThrows(() => v.normalize(), Error, 'division by 0')
})

Deno.test('Vector - dot product overloads', () => {
  const v = $v(1, 2, 3)
  // (1*2)+(2*0)+(3*1) = 5
  assertEquals(v.dot(2, 0, 1), 5)
  assertEquals(v.dot($v(2, 0, 1)), 5)
})

Deno.test('Vector - cross product overloads', () => {
  const v1 = $v(1, 0, 0)
  const res1 = v1.cross(0, 1, 0)
  assert(res1.equals(0, 0, 1))

  const res2 = v1.cross($v(0, 1, 0))
  assert(res2.equals(0, 0, 1))
})

Deno.test('Vector - dist and distSq overloads', () => {
  const v1 = $v(1, 0, 0)
  // const v2 = $v(4, 0, 0)

  assertEquals(v1.dist(4, 0, 0), 3)
  assertEquals(v1.dist($v(4, 0, 0)), 3)

  assertEquals(v1.distSq(4, 0, 0), 9)
  assertEquals(v1.distSq($v(4, 0, 0)), 9)
})

Deno.test('Vector - angleBetween overloads', () => {
  const v1 = $v(1, 0, 0)
  // const v2 = $v(0, 1, 0)

  assertAlmostEquals(v1.angleBetween(0, 1, 0), Math.PI / 2)
  assertAlmostEquals(v1.angleBetween($v(0, 1, 0)), Math.PI / 2)

  // Angle between same vector should be 0
  assertAlmostEquals(v1.angleBetween(1, 0, 0), 0)
  // Angle between opposite vectors should be PI
  assertAlmostEquals(v1.angleBetween(-1, 0, 0), Math.PI)
})

Deno.test('Vector - inBetween (LERP) overloads', () => {
  const start = $v(0, 0, 0)
  const end = $v(10, 20, 30)

  // Test Vector signature
  assert(start.inBetween(end, 0.5).equals(5, 10, 15))
  assert(start.inBetween(end, 0).equals(0, 0, 0))
  assert(start.inBetween(end, 1).equals(10, 20, 30))

  // Test numeric signature
  assert(start.inBetween(10, 20, 30, 0.1).equals(1, 2, 3))
})

// --- Logical Checks ---

Deno.test('Vector - isAllZeros and isAllOnes', () => {
  assert($v(0, 0, 0).isAllZeros())
  assert(!$v(0.0001, 0, 0).isAllZeros())

  assert($v(1, 1, 1).isAllOnes())
  assert(!$v(1, 1, 0.99).isAllOnes())
})

Deno.test('Vector - equals overload', () => {
  const v = $v(1, 2, 3)
  assert(v.equals(1, 2, 3))
  assert(v.equals($v(1, 2, 3)))
  assert(!v.equals(1, 2, 4))
})

// --- Matrix & Conversion Coverage ---

Deno.test('Vector - 4dMatrix Roundtrip', () => {
  const original = $v(Math.random(), Math.random(), Math.random())
  const matrix = original.to4dMatrix() as transformationMatrix4x1Type

  assertEquals(matrix.length, 4)
  assertEquals(matrix[3][0], FOURTH_DIMENSION_COORD)

  const reconstructed = Vector.from4dMatrix(matrix)
  assert(original.equals(reconstructed))
})

// --- Utilities & Symbols Coverage ---

Deno.test('Vector - toArray and toString', () => {
  const v = $v(1, 2, 3)
  const arr = v.toArray()

  assertEquals(arr, [1, 2, 3])
  assertEquals(arr, v.coords)
  // assertNotEquals(
  //   arr,
  //   v.coords,
  //   'toArray should return a copy, not the original reference',
  // )

  assertEquals(v.toString(), '[1,2,3]')
})

Deno.test('Vector - Iterator protocol', () => {
  const v = $v(7, 8, 9)
  const results: number[] = []
  for (const coord of v) {
    results.push(coord)
  }
  assertEquals(results, [7, 8, 9])

  const [x, y, z] = v
  assertEquals(x, 7)
  assertEquals(y, 8)
  assertEquals(z, 9)
})

Deno.test('Vector - clone is deep enough', () => {
  const v1 = $v(1, 1, 1)
  const v2 = v1.clone()
  v1.x = 5

  assertEquals(v2.x, 1, 'Cloned vector should not change when original changes')
})

Deno.test('Vector - setMag magnitude check', () => {
  const v = $v(1, 1, 1) // length sqrt(3)
  v.setMag(10)
  assertAlmostEquals(v.mag(), 10)
})
