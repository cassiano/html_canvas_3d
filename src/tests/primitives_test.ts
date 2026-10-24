/// <reference lib="deno.ns" />

import './dom_stub.ts'

import {
  assert,
  assertAlmostEquals,
  assertEquals,
  assertThrows,
} from '@std/assert'

import {
  animation,
  arrow,
  background,
  box,
  centralize,
  circle2d,
  circlePerimeter2d,
  cone,
  ctx,
  cube,
  cylinder,
  DEFAULT_SHAPE_OPTIONS,
  DEFAULT_TRANSFORMATION_MATRIX,
  isolateTransformations,
  line,
  point,
  pop,
  popMatrix,
  project3dTo2d,
  push,
  pushMatrix,
  quad,
  rect2d,
  render3dAxes,
  render3dScene,
  resetTransformationMatrix,
  restoreCoordinateSystem,
  ring,
  rotate,
  rotateX,
  rotateY,
  rotateZ,
  saturnRing,
  scale,
  SCREEN_CENTER,
  setAutoRotationCheckboxEnabled,
  setDragRotation,
  setPanOffset,
  setRender3dAxesEnabled,
  setshowNormals,
  setZoom,
  showNormals,
  sphere,
  sphericalCheeseSlice,
  square2d,
  text2d,
  torus,
  transform,
  transformNormal,
  translate,
  triangle2d,
  addDragRotation,
  addPanOffset,
  addZoom,
  resetDragRotation,
  resetPanOffset,
  resetZoom,
  autoRotationEnabled,
  render3dAxesEnabled,
} from '../primitives.ts'
import { AXES } from '../constants.ts'
import { PI } from '../math_utils.ts'
import { $v, Vector3d } from '../vector_3d.ts'
import {
  assertClose,
  recordedCalls,
  recordingContext,
  resetScene,
} from './test_helpers.ts'

/**
 * Alias for `Deno.test`, used to register the test cases in this file.
 */
const test = Deno.test

/**
 * Asserts that a vector is close to the expected coordinates.
 *
 * @param actual - The vector produced by the code under test.
 * @param expected - The expected `[x, y, z]` coordinates.
 */
const assertVectorClose = (actual: Vector3d, expected: number[]) => {
  assertClose(actual.x, expected[0])
  assertClose(actual.y, expected[1])
  assertClose(actual.z, expected[2])
}

/**
 * The focal length used by the perspective projection, derived from the
 * stubbed canvas size.
 */
const FOCAL_LENGTH = Math.min(animation.width, animation.height) /
  (2 * Math.tan((PI / 4) / 2))

/**
 * Verifies that the stubbed canvas is wired into the renderer.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Primitives - The canvas and its context are available', () => {
  assert(animation !== null)
  assert(ctx !== null)
  assertEquals(animation.width, 800)
  assertEquals(animation.height, 600)
})

/**
 * Verifies that the default shape options hold the documented values.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Primitives - DEFAULT_SHAPE_OPTIONS', () => {
  assertEquals(DEFAULT_SHAPE_OPTIONS.color, 'gray')
  assertEquals(DEFAULT_SHAPE_OPTIONS.lineWidth, 1)
  assertEquals(DEFAULT_SHAPE_OPTIONS.opacity, 1)
  assertEquals(DEFAULT_SHAPE_OPTIONS.strokeColor, 'black')
  assertEquals(DEFAULT_SHAPE_OPTIONS.noStroke, false)
  assertEquals(DEFAULT_SHAPE_OPTIONS.size, 1)
  assertEquals(DEFAULT_SHAPE_OPTIONS.noSplit, false)
  assertEquals(DEFAULT_SHAPE_OPTIONS.isDoubleSided, false)
  assertEquals(DEFAULT_SHAPE_OPTIONS.nevershowNormals, false)
  assertEquals(DEFAULT_SHAPE_OPTIONS.percentage, 1)
})

/**
 * Verifies that the screen center matches the canvas size.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Primitives - SCREEN_CENTER', () => {
  assertEquals(SCREEN_CENTER.toArray(), [
    animation.width / 2,
    animation.height / 2,
    0,
  ])
})

/**
 * Verifies that the default transformation matrix inverts the Y-axis and
 * keeps the X and Z axes untouched.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Primitives - DEFAULT_TRANSFORMATION_MATRIX', () => {
  assertEquals(DEFAULT_TRANSFORMATION_MATRIX, [
    [1, 0, 0, 0],
    [0, -1, 0, 0],
    [0, 0, 1, 0],
    [0, 0, 0, 1],
  ])

  resetScene()

  assertEquals(transform($v(1, 2, 3)).toArray(), [1, -2, 3])
})

/**
 * Verifies that `transform()` applies the current transformation matrix and
 * that `transformNormal()` ignores the translation.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Primitives - transform() and transformNormal()', () => {
  resetScene()

  translate(10, 20, 30)

  assertEquals(transform($v(1, 2, 3)).toArray(), [11, -22, 33])
  assertEquals(transformNormal($v(1, 2, 3)).toArray(), [1, -2, 3])
  assertEquals(transformNormal($v(0, 0, 0)).toArray(), [0, 0, 0])
})

/**
 * Verifies that `scale()` scales the scene on every axis.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Primitives - scale()', () => {
  resetScene()

  scale(2)
  assertEquals(transform($v(1, 2, 3)).toArray(), [2, -4, 6])

  resetScene()

  scale(2, 3, 4)
  assertEquals(transform($v(1, 2, 3)).toArray(), [2, -6, 12])

  resetScene()

  scale($v(1, 2, 3))
  assertEquals(transform($v(1, 2, 3)).toArray(), [1, -4, 9])

  // Scaling by one is a no-op.
  resetScene()

  scale(1)
  assertEquals(transform($v(1, 2, 3)).toArray(), [1, -2, 3])
})

/**
 * Verifies that `translate()` offsets the scene on every axis.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Primitives - translate()', () => {
  resetScene()

  translate(10, 20, 30)
  assertEquals(transform($v(0, 0, 0)).toArray(), [10, -20, 30])

  resetScene()

  translate($v(1, 2, 3))
  assertEquals(transform($v(0, 0, 0)).toArray(), [1, -2, 3])

  // Translating by zero is a no-op.
  resetScene()

  translate(0, 0, 0)
  assertEquals(transform($v(5, 6, 7)).toArray(), [5, -6, 7])
})

/**
 * Verifies that the axis-specific rotation helpers rotate the scene around
 * the expected axis, preserving the vector's magnitude.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Primitives - rotateX(), rotateY() and rotateZ()', () => {
  resetScene()

  rotateX(PI / 2)
  assertVectorClose(transform($v(0, 1, 0)), [0, 0, 1])

  resetScene()

  rotateY(PI / 2)
  assertVectorClose(transform($v(1, 0, 0)), [0, 0, -1])

  resetScene()

  rotateZ(PI / 2)
  assertVectorClose(transform($v(1, 0, 0)), [0, -1, 0])

  // A rotation preserves the magnitude of the rotated vector.
  resetScene()

  rotateZ(PI / 3)
  assertAlmostEquals(transform($v(3, 4, 5)).mag(), $v(3, 4, 5).mag())
})

/**
 * Verifies that rotating by a zero angle leaves the scene untouched.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Primitives - Rotating by zero is a no-op', () => {
  resetScene()

  rotateX(0)
  rotateY(0)
  rotateZ(0)
  rotate(0, AXES.x)

  assertEquals(transform($v(1, 2, 3)).toArray(), [1, -2, 3])
})

/**
 * Verifies that `rotate()` around an arbitrary axis matches the
 * axis-specific helpers when the axis is canonical.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Primitives - rotate() with a canonical axis', () => {
  resetScene()

  rotate(PI / 2, AXES.x, { isCanonical: true })
  const aroundX = transform($v(0, 1, 0)).toArray()

  resetScene()

  rotateX(PI / 2)
  assertEquals(aroundX, transform($v(0, 1, 0)).toArray())

  resetScene()

  rotate(PI / 2, AXES.y, { isCanonical: true })
  const aroundY = transform($v(1, 0, 0)).toArray()

  resetScene()

  rotateY(PI / 2)
  assertEquals(aroundY, transform($v(1, 0, 0)).toArray())

  resetScene()

  rotate(PI / 2, AXES.z, { isCanonical: true })
  const aroundZ = transform($v(1, 0, 0)).toArray()

  resetScene()

  rotateZ(PI / 2)
  assertEquals(aroundZ, transform($v(1, 0, 0)).toArray())
})

/**
 * Verifies that `rotate()` normalizes the axis when it is not canonical.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Primitives - rotate() normalizes a non-canonical axis', () => {
  resetScene()

  rotate(PI / 2, $v(0, 0, 5))
  const aroundScaledZ = transform($v(1, 0, 0)).toArray()

  resetScene()

  rotate(PI / 2, $v(0, 0, 1), { isCanonical: true })
  assertEquals(aroundScaledZ, transform($v(1, 0, 0)).toArray())
})

/**
 * Verifies that the transformation matrix stack saves and restores the
 * scene's state.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Primitives - push() and pop()', () => {
  resetScene()

  translate(10, 0, 0)
  push()

  translate(5, 0, 0)
  assertEquals(transform($v(0, 0, 0)).x, 15)

  pop()

  assertEquals(transform($v(0, 0, 0)).x, 10)
})

/**
 * Verifies that popping an empty transformation stack throws an `Error`.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Primitives - pop() throws on an empty stack', () => {
  resetScene()

  assertThrows(
    () => pop(),
    Error,
    'Empty transformation matrix stack',
  )
})

/**
 * Verifies that the `pushMatrix`/`popMatrix` synonyms behave like
 * `push()`/`pop()`.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Primitives - pushMatrix() and popMatrix()', () => {
  resetScene()

  translate(3, 0, 0)
  pushMatrix()

  translate(4, 0, 0)
  popMatrix()

  assertEquals(transform($v(0, 0, 0)).x, 3)
})

/**
 * Verifies that `isolateTransformations()` restores the previous state even
 * when the wrapped function throws.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Primitives - isolateTransformations()', () => {
  resetScene()

  translate(7, 0, 0)

  isolateTransformations(() => {
    translate(100, 0, 0)

    assertEquals(transform($v(0, 0, 0)).x, 107)
  })

  assertEquals(transform($v(0, 0, 0)).x, 7)

  // The synonym behaves the same way.
  resetScene()

  translate(1, 0, 0)

  restoreCoordinateSystem(() => {
    translate(1, 0, 0)
  })

  assertEquals(transform($v(0, 0, 0)).x, 1)
})

/**
 * Verifies that the projection returns `undefined` for points that lie
 * behind the camera.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Primitives - project3dTo2d() rejects points behind the camera', () => {
  resetScene()

  assert(project3dTo2d($v(0, 0, 0)) !== undefined)
  assert(project3dTo2d($v(0, 0, FOCAL_LENGTH - 1)) !== undefined)
  assertEquals(project3dTo2d($v(0, 0, FOCAL_LENGTH)), undefined)
  assertEquals(project3dTo2d($v(0, 0, FOCAL_LENGTH + 100)), undefined)
})

/**
 * Verifies that the projection applies a perspective scale that grows as
 * the point gets closer to the camera.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Primitives - project3dTo2d() applies a perspective scale', () => {
  resetScene()

  const atOrigin = project3dTo2d($v(10, 0, 0))!
  const closer = project3dTo2d($v(10, 0, 100))!

  assert(closer.x > atOrigin.x)
  assertAlmostEquals(closer.x, 10 * (FOCAL_LENGTH / (FOCAL_LENGTH - 100)))
})

/**
 * Verifies that `centralize()` moves a point to the center of the canvas
 * and applies the current pan offset.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Primitives - centralize()', () => {
  resetScene()

  assertEquals(centralize()?.toArray(), undefined)
  assertEquals(centralize($v(0, 0, 0))?.toArray(), [
    animation.width / 2,
    animation.height / 2,
    0,
  ])

  setPanOffset(25, -15)

  assertEquals(centralize($v(0, 0, 0))?.toArray(), [
    animation.width / 2 + 25,
    animation.height / 2 - 15,
    0,
  ])
})

/**
 * Verifies that the camera controls accumulate and reset the zoom, the pan
 * offset and the drag rotation.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Primitives - Camera controls', () => {
  resetScene()

  setZoom(3)
  addZoom(1)
  resetTransformationMatrix()

  assertEquals(transform($v(1, 0, 0)).x, 4)

  resetZoom()
  resetTransformationMatrix()

  assertEquals(transform($v(1, 0, 0)).x, 1)

  resetScene()

  setPanOffset(10, 10)
  addPanOffset(5, 5)

  assertEquals(centralize($v(0, 0, 0))?.x, animation.width / 2 + 15)

  resetPanOffset()

  assertEquals(centralize($v(0, 0, 0))?.x, animation.width / 2)

  resetScene()

  setDragRotation(0, PI / 2)
  resetTransformationMatrix()

  assertVectorClose(transform($v(1, 0, 0)), [0, 0, -1])

  addDragRotation(0, PI / 2)
  resetTransformationMatrix()

  const halfTurn = transform($v(1, 0, 0))
  assertVectorClose(halfTurn, [-1, 0, 0])

  resetDragRotation()
  resetTransformationMatrix()

  assertEquals(transform($v(1, 0, 0)).toArray(), [1, 0, 0])
})

/**
 * Verifies that the display toggles update the exported flags.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Primitives - Display toggles', () => {
  resetScene()

  assertEquals(showNormals, false)
  assertEquals(render3dAxesEnabled, true)
  assertEquals(autoRotationEnabled, true)

  setshowNormals(true)
  setRender3dAxesEnabled(false)
  setAutoRotationCheckboxEnabled(false)

  assertEquals(showNormals, true)
  assertEquals(render3dAxesEnabled, false)
  assertEquals(autoRotationEnabled, false)
})

/**
 * Verifies that `background()` fills the whole canvas.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Primitives - background()', () => {
  resetScene()

  background('lightGray')

  const fills = recordedCalls('fillRect')

  assertEquals(fills.length, 1)
  assertEquals(fills[0].args, [0, 0, animation.width, animation.height])
  assertEquals(fills[0].fillStyle, 'lightGray')
})

/**
 * Verifies that `point()` paints a square of the requested size, centered on
 * the projected position.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Primitives - point()', () => {
  resetScene()

  point($v(0, 0, 0), { color: 'red', size: 10 })

  render3dScene()

  const fills = recordedCalls('fillRect')

  assertEquals(fills.length, 1)
  assertEquals(fills[0].args, [
    animation.width / 2 - 5,
    animation.height / 2 - 5,
    10,
    10,
  ])
  assertEquals(fills[0].fillStyle, 'red')
  assertEquals(fills[0].globalAlpha, 1)
})

/**
 * Verifies that points behind the camera are not drawn.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Primitives - point() skips points behind the camera', () => {
  resetScene()

  point($v(0, 0, FOCAL_LENGTH + 100))
  render3dScene()

  assertEquals(recordedCalls('fillRect').length, 0)
})

/**
 * Verifies that `render3dScene()` paints the queued shapes from the
 * farthest to the nearest one, and empties the queue afterwards.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Primitives - render3dScene() sorts the shapes back-to-front', () => {
  resetScene()

  point($v(0, 0, 100), { color: 'near' })
  point($v(0, 0, -100), { color: 'far' })
  point($v(0, 0, 0), { color: 'middle' })

  render3dScene()

  const fills = recordedCalls('fillRect')

  assertEquals(fills.length, 3)
  assertEquals(fills.map(fill => fill.fillStyle), ['far', 'middle', 'near'])

  // The queue is emptied, so a second call paints nothing.
  const callsBefore = recordingContext().calls.length

  render3dScene()

  assertEquals(recordingContext().calls.length, callsBefore)
})

/**
 * Verifies that `line()` splits long segments into several strokes.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Primitives - line() splits long segments', () => {
  resetScene()

  line($v(0, 0, 0), $v(100, 0, 0))
  render3dScene()

  const strokes = recordedCalls('stroke')

  assert(strokes.length > 1)
})

/**
 * Verifies that `line()` draws a single stroke when `noSplit` is enabled.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Primitives - line() with noSplit', () => {
  resetScene()

  line($v(0, 0, 0), $v(100, 0, 0), { noSplit: true })
  render3dScene()

  assertEquals(recordedCalls('stroke').length, 1)
})

/**
 * Verifies that `line()` skips segments that lie behind the camera.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Primitives - line() skips points behind the camera', () => {
  resetScene()

  line($v(0, 0, FOCAL_LENGTH + 100), $v(10, 0, 0))
  render3dScene()

  assertEquals(recordedCalls('stroke').length, 0)
})

/**
 * Verifies that `triangle2d()` returns the projected screen coordinates of
 * its vertices.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Primitives - triangle2d() returns the screen coordinates', () => {
  resetScene()

  const { screenA, screenB, screenC } = triangle2d(
    $v(0, 0, 0),
    $v(10, 0, 0),
    $v(0, 10, 0),
  )

  assert(screenA !== undefined)
  assert(screenB !== undefined)
  assert(screenC !== undefined)

  assertAlmostEquals(screenA.x, animation.width / 2)
  assertAlmostEquals(screenA.y, animation.height / 2)
})

/**
 * Verifies that `triangle2d()` hides the faces that point away from the
 * camera, unless the shape is double-sided.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Primitives - triangle2d() culls the faces pointing away', () => {
  resetScene()

  triangle2d($v(0, 0, 0), $v(10, 0, 0), $v(0, 10, 0))
  render3dScene()

  assertEquals(recordedCalls('fill').length, 1)

  resetScene()

  triangle2d($v(0, 0, 0), $v(0, 10, 0), $v(10, 0, 0))
  render3dScene()

  assertEquals(recordedCalls('fill').length, 0)

  resetScene()

  triangle2d($v(0, 0, 0), $v(0, 10, 0), $v(10, 0, 0), {
    isDoubleSided: true,
  })
  render3dScene()

  assertEquals(recordedCalls('fill').length, 1)
})

/**
 * Verifies that `triangle2d()` skips degenerate triangles.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Primitives - triangle2d() skips degenerate triangles', () => {
  resetScene()

  triangle2d($v(0, 0, 0), $v(10, 0, 0), $v(20, 0, 0))
  render3dScene()

  assertEquals(recordedCalls('fill').length, 0)
})

/**
 * Verifies that `quad()` draws two triangles.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Primitives - quad()', () => {
  resetScene()

  quad(
    $v(-5, -5, 0),
    $v(5, -5, 0),
    $v(5, 5, 0),
    $v(-5, 5, 0),
    { isDoubleSided: true },
  )
  render3dScene()

  assertEquals(recordedCalls('fill').length, 2)
})

/**
 * Verifies that `rect2d()` and `square2d()` draw two triangles.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Primitives - rect2d() and square2d()', () => {
  resetScene()

  rect2d(10, 20, { isDoubleSided: true })
  render3dScene()

  assertEquals(recordedCalls('fill').length, 2)

  resetScene()

  square2d(10, { isDoubleSided: true })
  render3dScene()

  assertEquals(recordedCalls('fill').length, 2)
})

/**
 * Verifies that `box()` and `cube()` draw the six faces of the solid.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Primitives - box() and cube()', () => {
  resetScene()

  box(10, 20, 30, { isDoubleSided: true })
  render3dScene()

  assertEquals(recordedCalls('fill').length, 12)

  resetScene()

  cube(10, { isDoubleSided: true })
  render3dScene()

  assertEquals(recordedCalls('fill').length, 12)
})

/**
 * Verifies that `circle2d()` draws one slice per segment.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Primitives - circle2d()', () => {
  resetScene()

  circle2d(10, { circleSegments: 8, isDoubleSided: true })
  render3dScene()

  assertEquals(recordedCalls('fill').length, 8)
})

/**
 * Verifies that `circlePerimeter2d()` draws one stroke per segment.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Primitives - circlePerimeter2d()', () => {
  resetScene()

  circlePerimeter2d(10, { circleSegments: 8 })
  render3dScene()

  assertEquals(recordedCalls('stroke').length, 8)
})

/**
 * Verifies that `cone()` draws two triangles per segment.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Primitives - cone()', () => {
  resetScene()

  cone(10, 20, { circleSegments: 8, isDoubleSided: true })
  render3dScene()

  assertEquals(recordedCalls('fill').length, 16)
})

/**
 * Verifies that `cylinder()` draws the side and both caps.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Primitives - cylinder()', () => {
  resetScene()

  cylinder(10, 20, { circleSegments: 8, isDoubleSided: true })
  render3dScene()

  // Two triangles per side, plus two triangle caps.
  assertEquals(recordedCalls('fill').length, 8 * 4)
})

/**
 * Verifies that `ring()` draws one quad per segment.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Primitives - ring()', () => {
  resetScene()

  ring(10, 5, { circleSegments: 8, isDoubleSided: true })
  render3dScene()

  assertEquals(recordedCalls('fill').length, 16)
})

/**
 * Verifies that `saturnRing()` draws one quad per segment.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Primitives - saturnRing()', () => {
  resetScene()

  saturnRing(5, 10, { circleSegments: 8 })
  render3dScene()

  assertEquals(recordedCalls('fill').length, 16)
})

/**
 * Verifies that `sphericalCheeseSlice()` draws one quad per segment.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Primitives - sphericalCheeseSlice()', () => {
  resetScene()

  sphericalCheeseSlice(10, 5, { circleSegments: 8, isDoubleSided: true })
  render3dScene()

  assertEquals(recordedCalls('fill').length, 16)
})

/**
 * Verifies that `torus()` draws one ring per segment.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Primitives - torus()', () => {
  resetScene()

  torus(10, 2, 4, { circleSegments: 8, isDoubleSided: true })
  render3dScene()

  assertEquals(recordedCalls('fill').length, 4 * 16)
})

/**
 * Verifies that `sphere()` draws the requested number of quads.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Primitives - sphere()', () => {
  resetScene()

  sphere(10, {
    latitudeLines: 2,
    longitudeLines: 4,
    isDoubleSided: true,
  })
  render3dScene()

  assertEquals(recordedCalls('fill').length, (2 + 1) * 4 * 2)
})

/**
 * Verifies that `arrow()` draws a line and a cone-shaped head.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Primitives - arrow()', () => {
  resetScene()

  arrow($v(0, 0, 0), $v(0, 10, 0), {
    tipRadius: 2,
    tipHeight: 5,
    circleSegments: 8,
    isDoubleSided: true,
  })
  render3dScene()

  assert(recordedCalls('stroke').length >= 1)
  assert(recordedCalls('fill').length >= 8)
})

/**
 * Verifies that `text2d()` paints the message at the projected position,
 * using the requested font.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Primitives - text2d()', () => {
  resetScene()

  text2d('hello', $v(0, 0, 0), 'blue', { fontSize: 12, fontFamily: 'serif' })

  const texts = recordedCalls('fillText')

  assertEquals(texts.length, 1)
  assertEquals(texts[0].args[0], 'hello')
  assertEquals(texts[0].fillStyle, 'blue')
  assertEquals(recordingContext().font, 'bold 12px serif')
  assertAlmostEquals(texts[0].args[1] as number, animation.width / 2)
  assertAlmostEquals(texts[0].args[2] as number, animation.height / 2)
})

/**
 * Verifies that `render3dAxes()` draws the three coordinate axes, and that
 * it honours the axes toggle.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Primitives - render3dAxes()', () => {
  resetScene()

  render3dAxes(100)
  render3dScene()

  assert(recordedCalls('fill').length > 0)

  resetScene()

  setRender3dAxesEnabled(false)
  render3dAxes(100)
  render3dScene()

  assertEquals(recordedCalls('fill').length, 0)
  assertEquals(recordedCalls('stroke').length, 0)
})
