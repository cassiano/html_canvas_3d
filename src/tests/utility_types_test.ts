/// <reference lib="deno.ns" />

import { assertEquals } from '@std/assert'

import { Tuple } from '../utility_types.ts'

/**
 * Alias for `Deno.test`, used to register the test cases in this file.
 */
const test = Deno.test

/**
 * Verifies that `Tuple` builds tuples of the requested length at runtime.
 *
 * The type itself is erased at runtime, so the assertions below check the
 * values that a correctly typed tuple holds. The shape of the type is
 * verified by the type checker, which runs as part of `deno test`.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Utility types - Tuple of a fixed length', () => {
  const triple: Tuple<number, 3> = [1, 2, 3]

  assertEquals(triple.length, 3)
  assertEquals(triple[0], 1)
  assertEquals(triple[1], 2)
  assertEquals(triple[2], 3)
})

/**
 * Verifies that `Tuple` builds a tuple of exactly two elements.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Utility types - Tuple of two elements', () => {
  const pair: Tuple<number, 2> = [10, 20]

  assertEquals(pair.length, 2)
  assertEquals(pair[0], 10)
  assertEquals(pair[1], 20)
})

/**
 * Verifies that `Tuple` degrades into a plain array when the length is not a
 * literal number.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Utility types - Tuple with a non-literal length', () => {
  const length = 3

  const values: Tuple<number, number> = [1, 2, 3]

  assertEquals(values.length, length)
})
