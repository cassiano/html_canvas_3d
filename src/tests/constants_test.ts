/// <reference lib="deno.ns" />

import { assert, assertEquals } from '@std/assert'

import {
  AXES,
  AXES_NAMES,
  DEFAULT_ARROW_CIRCLE_SEGMENTS,
  DEFAULT_CIRCLE_SEGMENTS,
  DEFAULT_ELBOW_CIRCLE_SLICES,
  DEFAULT_SPHERE_LINES,
  FPS,
  FPS_LOGGING_FRAME_PERIOD,
  FPS_WINDOW,
  FOCAL_LENGTH,
  MAX_LINE_SEGMENT_SIZE,
  NORMAL_CONFIG,
  NULL_VECTOR,
  ORIGIN,
  ZERO_VECTOR,
  Z_EPSILON,
} from '../constants.ts'

/**
 * Alias for `Deno.test`, used to register the test cases in this file.
 */
const test = Deno.test

/**
 * Verifies that the axis names are listed in the documented order.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Constants - AXES_NAMES', () => {
  assertEquals(AXES_NAMES.length, 6)
  assertEquals([...AXES_NAMES], ['x', 'y', 'z', '-x', '-y', '-z'])
})

/**
 * Verifies that every axis name has a matching unit vector.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Constants - AXES covers every axis name', () => {
  AXES_NAMES.forEach(name => {
    assert(AXES[name] !== undefined, `Missing axis vector for "${name}"`)
  })

  assertEquals(Object.keys(AXES).length, AXES_NAMES.length)
})

/**
 * Verifies that the axis vectors are the canonical unit vectors.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Constants - AXES unit vectors', () => {
  assertEquals(AXES.x.toArray(), [1, 0, 0])
  assertEquals(AXES.y.toArray(), [0, 1, 0])
  assertEquals(AXES.z.toArray(), [0, 0, 1])
  assertEquals(AXES['-x'].toArray(), [-1, 0, 0])
  assertEquals(AXES['-y'].toArray(), [0, -1, 0])
  assertEquals(AXES['-z'].toArray(), [0, 0, -1])

  AXES_NAMES.forEach(name => {
    assertEquals(AXES[name].mag(), 1)
  })
})

/**
 * Verifies that each axis vector is the negation of its opposite.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Constants - AXES opposite vectors', () => {
  assert(AXES.x.equals(AXES['-x'].clone().mult(-1)))
  assert(AXES.y.equals(AXES['-y'].clone().mult(-1)))
  assert(AXES.z.equals(AXES['-z'].clone().mult(-1)))
})

/**
 * Verifies that the origin synonyms all point to the same vector.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Constants - ORIGIN synonyms', () => {
  assertEquals(ORIGIN.toArray(), [0, 0, 0])
  assert(ORIGIN.isAllZeros())

  assertEquals(NULL_VECTOR, ORIGIN)
  assertEquals(ZERO_VECTOR, ORIGIN)
})

/**
 * Verifies that the frame-rate constants hold their documented values.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Constants - Frame rate constants', () => {
  assertEquals(FPS, 120)
  assertEquals(FPS_WINDOW, 100)
  assertEquals(FPS_LOGGING_FRAME_PERIOD, 30)
})

/**
 * Verifies that the rendering constants hold sensible values.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Constants - Rendering constants', () => {
  assert(FOCAL_LENGTH > 0)
  assert(MAX_LINE_SEGMENT_SIZE > 0)
  assert(DEFAULT_CIRCLE_SEGMENTS > 0)
  assert(DEFAULT_ARROW_CIRCLE_SEGMENTS > 0)
  assert(DEFAULT_ELBOW_CIRCLE_SLICES > 0)
  assert(Z_EPSILON > 0)
  assert(Z_EPSILON < 1)
})

/**
 * Verifies that the sphere's default mesh resolution is made of two positive
 * counts.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Constants - DEFAULT_SPHERE_LINES', () => {
  assertEquals(DEFAULT_SPHERE_LINES.latitude, 36)
  assertEquals(DEFAULT_SPHERE_LINES.longitude, 72)
})

/**
 * Verifies that the normal-display configuration holds the expected values.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Constants - NORMAL_CONFIG', () => {
  assertEquals(NORMAL_CONFIG.length, 15)
  assertEquals(NORMAL_CONFIG.color, 'black')
  assertEquals(NORMAL_CONFIG.tip.radius, 2)
  assertEquals(NORMAL_CONFIG.tip.height, 5)
  assertEquals(NORMAL_CONFIG.tip.circleSegments, 3)
})
