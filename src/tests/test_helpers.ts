/// <reference lib="deno.ns" />

/**
 * Shared helpers for the test suite.
 *
 * The helpers in this module build on top of the stubbed browser environment
 * installed by {@link ./dom_stub.ts}, which must be imported first.
 */

import {
  domStub,
  FakeCanvasRenderingContext2D,
  resetDomStub,
} from './dom_stub.ts'
import {
  ctx,
  render3dScene,
  resetDragRotation,
  resetPanOffset,
  resetTransformationMatrix,
  resetZoom,
  setAutoRotationCheckboxEnabled,
  setRender3dAxesEnabled,
  setshowNormals,
} from '../primitives.ts'

/**
 * Returns the recording 2D context used by the renderer.
 *
 * @returns The stubbed 2D rendering context.
 */
export const recordingContext = (): FakeCanvasRenderingContext2D =>
  ctx as unknown as FakeCanvasRenderingContext2D

/**
 * Resets the renderer and the stubbed browser environment.
 *
 * The transformation matrix, the zoom level, the pan offset, the drag
 * rotation, the display toggles and the recorded drawing operations are all
 * restored to their initial state, so that every test starts from a known
 * baseline. Any shape still queued in the renderer's deferred render list is
 * flushed and discarded.
 */
export const resetScene = () => {
  resetTransformationMatrix()
  resetZoom()
  resetPanOffset()
  resetDragRotation()

  setshowNormals(false)
  setRender3dAxesEnabled(true)
  setAutoRotationCheckboxEnabled(true)

  // Flush the deferred render list so that no shape leaks into the next test.
  render3dScene()

  resetDomStub()
}

/**
 * Returns the names of the recorded drawing operations, in order.
 *
 * @returns The recorded operation names.
 */
export const recordedOps = (): string[] =>
  recordingContext().calls.map(call => call.op)

/**
 * Returns the recorded drawing operations whose name matches the given one.
 *
 * @param op - The name of the operation to look for.
 * @returns The matching recorded operations, in order.
 */
export const recordedCalls = (op: string) => recordingContext().callsOf(op)

/**
 * Returns the stubbed document.
 *
 * @returns The stubbed document.
 */
export const documentStub = () => domStub.document

/**
 * Registers an element in the stubbed document and returns it.
 *
 * @param id - The id to register the element under.
 * @param tagName - The element's tag name. Defaults to `'div'`.
 * @returns The registered element.
 */
export const registerElement = (id: string, tagName = 'div') => {
  const element = domStub.document.createElement(tagName)

  domStub.document.registerElement(id, element)

  return element
}

/**
 * Asserts that a value is within a small distance of an expected value.
 *
 * @param actual - The value produced by the code under test.
 * @param expected - The expected value.
 * @param tolerance - The maximum accepted distance. Defaults to `1e-9`.
 */
export const assertClose = (
  actual: number,
  expected: number,
  tolerance = 1e-9,
) => {
  if (Math.abs(actual - expected) > tolerance) {
    throw new Error(
      `Expected ${actual} to be within ${tolerance} of ${expected}`,
    )
  }
}
