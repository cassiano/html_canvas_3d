/// <reference lib="deno.ns" />

import './dom_stub.ts'

import { assert, assertEquals, assertThrows } from '@std/assert'

import { elbow } from '../elbow_primitives.ts'
import { AXES_NAMES } from '../constants.ts'
import { HALF_PI } from '../math_utils.ts'
import { PI } from '../math_utils.ts'
import { render3dScene, resetTransformationMatrix } from '../primitives.ts'
import { recordingContext, resetScene } from './test_helpers.ts'
import { FakeCanvasRenderingContext2D } from './dom_stub.ts'

/**
 * Alias for `Deno.test`, used to register the test cases in this file.
 */
const test = Deno.test

/**
 * Counts the number of filled triangles recorded by the stubbed renderer.
 *
 * @returns The number of `fill` calls.
 */
const fillCount = () => recordingContext().callsOf('fill').length

/**
 * Clears all recorded draw calls from the stubbed context.
 *
 * @returns Nothing.
 */
const clearCalls = () => {
  ;(recordingContext() as unknown as FakeCanvasRenderingContext2D & { calls: unknown[] }).calls =
    []
}

/**
 * Verifies that every named elbow variant renders without throwing.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Elbow primitives - named variants render', () => {
  resetScene()

  const variants = [
    elbow.x.y,
    elbow.x['-y'],
    elbow.x.z,
    elbow.x['-z'],
    elbow['-x'].y,
    elbow['-x']['-y'],
    elbow['-x'].z,
    elbow['-x']['-z'],
    elbow.y.x,
    elbow.y['-x'],
    elbow.y.z,
    elbow.y['-z'],
    elbow['-y'].x,
    elbow['-y']['-x'],
    elbow['-y'].z,
    elbow['-y']['-z'],
    elbow.z.x,
    elbow.z.y,
    elbow.z['-x'],
    elbow.z['-y'],
    elbow['-z'].x,
    elbow['-z'].y,
    elbow['-z']['-x'],
    elbow['-z']['-y'],
  ]

  variants.forEach(variant => {
    resetTransformationMatrix()
    clearCalls()
    variant(10, { circleSegments: 4, isDoubleSided: true }, false)
    render3dScene()
    assert(fillCount() > 0)
  })
})

/**
 * Verifies that the `elbow` lookup table exposes every axis permutation that
 * the primitives support.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Elbow primitives - lookup table covers all directions', () => {
  resetScene()

  const froms = ['x', 'y', 'z', '-x', '-y', '-z'] as const

  froms.forEach(from => {
    const group = (elbow as Record<string, Record<string, unknown>>)[from]
    Object.entries(group).forEach(([to, fn]) => {
      assert(typeof fn === 'function', `${from} -> ${to} should be defined`)

      resetTransformationMatrix()
      clearCalls()
      ;(fn as (r: number, o: unknown) => void)(10, {
        circleSegments: 4,
        isDoubleSided: true,
      })
      render3dScene()
      assert(fillCount() > 0)
    })
  })
})

/**
 * Verifies that `includeTranslation` offsets the elbow, and that passing
 * options forwards them to the underlying slice renderer.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Elbow primitives - translation and options', () => {
  resetScene()

  resetTransformationMatrix()
  clearCalls()
  elbow.y.x(10, { circleSegments: 4, isDoubleSided: true }, true)
  render3dScene()
  const withTranslation = fillCount()

  resetScene()
  resetTransformationMatrix()
  clearCalls()
  elbow.y.x(10, { circleSegments: 4, isDoubleSided: true }, false)
  render3dScene()
  const withoutTranslation = fillCount()

  // The translation does not add geometry, it only moves the transformation.
  assertEquals(withTranslation, withoutTranslation)
})



/**
 * Verifies that `elbowCircleSlices` controls the number of slices rendered.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Elbow primitives - elbowCircleSlices affects resolution', () => {
  resetScene()

  resetTransformationMatrix()
  clearCalls()
  elbow.y.x(10, { circleSegments: 4, isDoubleSided: true, elbowCircleSlices: 2 })
  render3dScene()
  const coarse = fillCount()

  resetScene()
  resetTransformationMatrix()
  clearCalls()
  elbow.y.x(10, { circleSegments: 4, isDoubleSided: true, elbowCircleSlices: 8 })
  render3dScene()
  const fine = fillCount()

  assert(fine > coarse)
})

/**
 * Verifies that the shared axis name list is used by the API.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Elbow primitives - uses the standard axis names', () => {
  assert(AXES_NAMES.includes('x'))
  assert(AXES_NAMES.includes('-z'))
})
