/// <reference lib="deno.ns" />

// To execute tests, run:
//
// `deno test`
// `deno test --watch`

import './dom_stub.ts'
import {
  assert,
  assertEquals,
  assertGreaterOrEqual,
  assertLessOrEqual,
  assertMatch,
  assertNotEquals,
  assertThrows,
} from '@std/assert'

import { perlin } from '../demo10/perlin_noise.ts'
import { Terrain } from '../demo10/terrain.ts'
import { render3dScene } from '../primitives.ts'
import {
  clearAnimationFrames,
  domStub,
  FakeEvent,
  flushAnimationFrames,
} from './dom_stub.ts'
import { recordingContext, resetScene } from './test_helpers.ts'
import { demoForm, start, stop } from '../demo10/main.ts'

/**
 * Alias for `Deno.test`, used to register the test cases in this file.
 */
const test = Deno.test

/**
 * Paints everything that is still queued for rendering and then clears the
 * recorded drawing operations, so that a test starts with an empty canvas.
 */
const flushAndReset = () => {
  render3dScene()
  resetScene()
}

/**
 * Returns the element hosting the demo's canvas and control panel.
 */
const canvasContainer = () =>
  domStub.document.getElementById('canvas-container')!

/**
 * The timestamp used by the last batch of animation frames.
 *
 * The frame loop only draws a frame when enough time has passed since the
 * previous one, so every batch of frames is given a timestamp far enough in
 * the future to guarantee that the frames are actually drawn.
 */
let lastFrameTime = 1000

/**
 * Runs a batch of animation frames, always moving the clock forward.
 *
 * @param times - How many frames to run.
 * @returns The timestamps the frames were run with.
 */
const advanceFrames = (times: number) => {
  lastFrameTime += 1000

  return flushAnimationFrames(times, lastFrameTime, 16)
}

/**
 * Collects a sample of the noise field currently held by the generator.
 *
 * @param count - How many points of the field to sample.
 * @returns The sampled values, in sampling order.
 */
const sampleField = (count = 100) =>
  Array.from(
    { length: count },
    (_, index) => perlin.noise(index * 0.37, index * 0.11, index * 0.05),
  )

// -------------------------------------------------------------------------------------------------
// Perlin noise
// -------------------------------------------------------------------------------------------------

/**
 * Verifies that the noise values produced by the generator are normalised to the `[0, 1]` range.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Perlin - the noise values are normalised to the [0, 1] range', () => {
  perlin.seed(2024)

  for (let index = 0; index < 500; index++) {
    const value = perlin.noise(index * 0.37, index * 0.11, index * 0.05)

    assertGreaterOrEqual(value, 0, `noise value ${value} is below 0`)
    assertLessOrEqual(value, 1, `noise value ${value} is above 1`)
  }
})

/**
 * Verifies that seeding the generator twice with the same value produces the very same noise field.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Perlin - the same seed always produces the same field', () => {
  perlin.seed(7)
  const first = sampleField()

  perlin.seed(1234)
  perlin.seed(7)
  const second = sampleField()

  assertEquals(first, second)
})

/**
 * Verifies that two different seeds produce two different noise fields.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Perlin - different seeds produce different fields', () => {
  perlin.seed(1)
  const first = sampleField()

  perlin.seed(2)
  const second = sampleField()

  const different = second.filter((value, index) => value !== first[index])
    .length

  assert(
    different > first.length / 2,
    `only ${different} of ${first.length} samples differ between two seeds`,
  )
})

/**
 * Verifies that re-seeding the generator resets the noise field to the one it held for that seed.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Perlin - re-seeding the generator resets the field', () => {
  perlin.seed(11)
  const original = perlin.noise(3.3, 1.1)

  perlin.seed(22)
  const other = perlin.noise(3.3, 1.1)

  perlin.seed(11)
  const restored = perlin.noise(3.3, 1.1)

  assertEquals(restored, original)
  assertNotEquals(other, original)
})

/**
 * Verifies that the noise field varies smoothly between neighbouring coordinates.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Perlin - the field varies smoothly between neighbouring coordinates', () => {
  perlin.seed(42)

  let maxDelta = 0

  for (let index = 0; index < 500; index++) {
    const x = index * 0.01

    maxDelta = Math.max(
      maxDelta,
      Math.abs(perlin.noise(x) - perlin.noise(x + 0.01)),
    )
  }

  assert(
    maxDelta < 0.05,
    `the noise jumped by ${maxDelta} between two neighbouring coordinates`,
  )
})

/**
 * Verifies that the noise function accepts one, two or three coordinates, the missing ones defaulting to zero.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Perlin - the noise function accepts one, two or three coordinates', () => {
  perlin.seed(5)

  assertEquals(perlin.noise(2.5), perlin.noise(2.5, 0, 0))
  assertEquals(perlin.noise(2.5, 3.5), perlin.noise(2.5, 3.5, 0))
})

/**
 * Verifies that the noise field varies along every one of its three dimensions.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Perlin - the field varies along every dimension', () => {
  perlin.seed(6)

  let variesAlongY = false
  let variesAlongZ = false

  for (let index = 0; index < 100; index++) {
    const x = index * 0.37
    const y = index * 0.11
    const z = index * 0.05

    if (perlin.noise(x, y) !== perlin.noise(x, y + 1)) variesAlongY = true
    if (perlin.noise(x, y, z) !== perlin.noise(x, y, z + 1)) variesAlongZ = true
  }

  assert(variesAlongY, 'the field does not vary along the Y axis')
  assert(variesAlongZ, 'the field does not vary along the Z axis')
})

// -------------------------------------------------------------------------------------------------
// Terrain
// -------------------------------------------------------------------------------------------------

/**
 * Verifies that the number of rows and columns of the terrain is derived from its size and from the size of its tiles.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Terrain - the number of rows and columns is derived from the terrain size', () => {
  const terrain = new Terrain(10, 500, 300, 160, 10)

  assertEquals(terrain.rows, 30)
  assertEquals(terrain.cols, 50)
})

/**
 * Verifies that the height map of the terrain is empty until the terrain has been calculated.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Terrain - the height map is empty until the terrain is calculated', () => {
  const terrain = new Terrain(10, 100, 100, 160, 10)

  assertEquals(terrain.z, [])
})

/**
 * Verifies that calculating the terrain fills its height map with one height for every tile.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Terrain - calculate fills the height map with one height per tile', () => {
  const terrain = new Terrain(10, 100, 80, 160, 10)

  terrain.calculate(0)

  assertEquals(terrain.z.length, terrain.cols)
  assertEquals(terrain.z[0].length, terrain.rows)
})

/**
 * Verifies that the heights of the tiles stay within half of the terrain's depth, around its middle.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Terrain - the tile heights stay within half of the terrain depth', () => {
  const terrain = new Terrain(10, 100, 80, 40, 10)

  terrain.calculate(0)

  terrain.z.forEach(column =>
    column.forEach(height => {
      assertGreaterOrEqual(height, -terrain.depth / 2)
      assertLessOrEqual(height, terrain.depth / 2)
    })
  )
})

/**
 * Verifies that calculating the terrain at another offset produces a different shape.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Terrain - calculating the terrain at another offset produces a different shape', () => {
  const terrain = new Terrain(10, 100, 80, 160, 10)

  terrain.calculate(0)
  const first = terrain.z.flat()

  terrain.calculate(7.5)
  const second = terrain.z.flat()

  const changed = second.filter((height, index) => height !== first[index])
    .length

  assert(
    changed > first.length / 2,
    `only ${changed} of ${first.length} heights changed`,
  )
})

/**
 * Verifies that rendering a terrain that has not been calculated yet throws a `TypeError`.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Terrain - render throws when the terrain has not been calculated', () => {
  const terrain = new Terrain(10, 50, 50, 160, 10)

  assertThrows(() => terrain.render(), TypeError)
})

/**
 * Verifies that rendering the terrain paints one quad — two triangles — for every tile of the grid.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Terrain - render paints one quad for every tile of the grid', () => {
  flushAndReset()

  const terrain = new Terrain(10, 100, 80, 160, 10)

  terrain.calculate(0)
  terrain.render()
  render3dScene()

  const fills = recordingContext().callsOf('fill')

  assertEquals(fills.length, (terrain.cols - 1) * (terrain.rows - 1) * 2)
})

/**
 * Verifies that the tiles of the terrain are painted with a colour derived from their height.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Terrain - the tiles are painted with a colour derived from their height', () => {
  flushAndReset()

  const terrain = new Terrain(10, 100, 80, 160, 10)

  terrain.calculate(0)
  terrain.render()
  render3dScene()

  const fills = recordingContext().callsOf('fill')

  assert(fills.length > 0)

  fills.forEach(call =>
    assertMatch(String(call.fillStyle), /^hsl\(/, 'the tile is not painted with an HSL colour')
  )
})

// -------------------------------------------------------------------------------------------------
// Demo
// -------------------------------------------------------------------------------------------------

/**
 * Verifies that starting the demo creates its control panel and populates the demo form with the documented sliders.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Demo 10 - start creates the control panel and populates the demo form', () => {
  stop()
  resetScene()

  start()

  const sliders = demoForm.sliders

  assert(sliders, 'the demo form has no sliders')
  assertEquals(Object.keys(sliders).sort(), [
    'depth',
    'smoothiness',
    'tileSize',
  ])
  assertEquals(sliders.tileSize.getValue(), 10)
  assertEquals(sliders.smoothiness.getValue(), 10)
  assertEquals(sliders.depth.getValue(), 160)
  assertEquals(canvasContainer().children.length, 1)

  stop()
})

/**
 * Verifies that stopping the demo removes its control panel from the page.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Demo 10 - stop removes the control panel from the page', () => {
  stop()
  resetScene()

  start()

  assertEquals(canvasContainer().children.length, 1)

  stop()

  assertEquals(canvasContainer().children.length, 0)
})

/**
 * Verifies that the animation loop of the demo paints the background and the terrain on the canvas.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Demo 10 - the animation loop paints the background and the terrain', () => {
  stop()
  resetScene()

  start()

  flushAnimationFrames(2, 100, 16)

  const context = recordingContext()
  const backgrounds = context.callsOf('fillRect')

  assert(backgrounds.length >= 2, 'the background was not painted')
  assertEquals(backgrounds[0].fillStyle, 'lightGray')
  assert(context.callsOf('fill').length > 0, 'the terrain was not painted')

  stop()
  clearAnimationFrames()
})

/**
 * Verifies that changing the size of the tiles rebuilds the terrain, painting fewer tiles.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Demo 10 - changing the tile size slider rebuilds the terrain', () => {
  stop()
  resetScene()

  start()

  advanceFrames(1)

  const fillsInFirstFrame = recordingContext().callsOf('fill').length

  const tileSizeInput = demoForm.sliders!.tileSize.getInput()

  tileSizeInput.value = '20'
  // The stubbed element dispatches its own event objects.
  tileSizeInput.dispatchEvent(new FakeEvent('input') as unknown as Event)

  // The larger tiles rebuild the terrain immediately; the next frame paints
  // the new, coarser mesh.
  advanceFrames(1)

  const fillsInSecondFrame = recordingContext().callsOf('fill').length -
    fillsInFirstFrame

  assert(
    fillsInSecondFrame < fillsInFirstFrame / 2,
    `the terrain still painted ${fillsInSecondFrame} tiles after the tile size changed`,
  )

  stop()
  clearAnimationFrames()
})
