/// <reference lib="deno.ns" />

import './dom_stub.ts'

import {
  assert,
  assertEquals,
  assertFalse,
} from '@std/assert'

import {
  autoRotationEnabled,
  centralize,
  render3dAxesEnabled,
  resetTransformationMatrix,
  showNormals,
  transform,
} from '../primitives.ts'
import { $v } from '../vector_3d.ts'
import {
  createKeyboardEvent,
  createPointerEvent,
  createWheelEvent,
  domStub,
  FakeEvent,
} from './dom_stub.ts'
import { demoCalls, resetDemoCalls } from './home_demo_recorder.ts'
import { assertClose, resetScene } from './test_helpers.ts'

/**
 * Whether the test process is allowed to read the application sources.
 *
 * `home.ts` uses Vite's `import.meta.glob`, which is not available under Deno.
 * The tests therefore read the file and replace the glob with an inline map of
 * fake demo modules, which requires the `read` permission. Without it the home
 * tests are skipped instead of failing.
 */
const canRead = Deno.permissions.querySync({ name: 'read' }).state === 'granted'

/**
 * Registers a test that is skipped when the `read` permission is missing.
 *
 * @param name - The test name.
 * @param fn - The test body.
 * @returns Nothing.
 */
const test = (name: string, fn: () => void | Promise<void>) => {
  Deno.test({ name, ignore: !canRead, fn })
}

/** The module path of a demo, as used by `home.ts`. */
const demoPath = (demoNumber: number) => `./demo${demoNumber}/main.ts`

/**
 * Encodes a string as base64, so that it can be embedded in a `data:` URL.
 *
 * @param text - The text to encode.
 * @returns The base64 representation of the UTF-8 encoded text.
 */
const toBase64 = (text: string) => {
  const bytes = new TextEncoder().encode(text)
  const chunkSize = 0x8000
  let binary = ''

  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(
      ...bytes.subarray(offset, offset + chunkSize),
    )
  }

  return btoa(binary)
}

/**
 * Builds a Deno-compatible copy of `src/home.ts`.
 *
 * The copy replaces Vite's `import.meta.glob` with an inline map of fake demo
 * modules and rewrites the relative imports to absolute `file:` URLs, so that
 * it can be imported from a `data:` URL.
 *
 * @param nonce - A value that makes every copy a distinct module instance.
 * @returns The transformed source code.
 */
const buildHomeSource = async (nonce: number) => {
  const homeUrl = new URL('../home.ts', import.meta.url)
  const source = await Deno.readTextFile(homeUrl)

  const demoEntries = Array.from({ length: 22 }, (_, index) => {
    const path = JSON.stringify(demoPath(index + 1))

    return `  ${path}: async () => ({` +
      ` start: () => recordDemoCall('start', ${path}),` +
      ` stop: () => recordDemoCall('stop', ${path}) }),`
  }).join('\n')

  const recorderUrl = new URL('./home_demo_recorder.ts', import.meta.url).href
  const absolute = (specifier: string) =>
    `'${new URL(specifier, homeUrl).href}'`

  const rewritten = source
    .replace(
      /const demoModules = import\.meta\.glob\([^\n]*?\)/,
      `const demoModules = {\n${demoEntries}\n}`,
    )
    .replaceAll("'./math_utils.ts'", absolute('./math_utils.ts'))
    .replaceAll("'./primitives.ts'", absolute('./primitives.ts'))
    .replaceAll("'./utils.ts'", absolute('./utils.ts'))

  return `// home instance ${nonce}\n` +
    `import { recordDemoCall } from '${recorderUrl}'\n` +
    rewritten
}

/**
 * Lets the pending promises settle.
 *
 * @returns A promise that resolves on the next macrotask.
 */
const flushPromises = () => new Promise<void>(resolve => setTimeout(resolve, 0))

/**
 * Imports a transformed copy of `home.ts`.
 *
 * @param nonce - A value that makes every copy a distinct module instance.
 * @returns Nothing; the shell is installed as a side effect.
 */
const importHome = async (nonce: number) => {
  const source = await buildHomeSource(nonce)

  await import(`data:text/typescript;base64,${toBase64(source)}`)
  await flushPromises()
}

/** The promise of the first, cached `home.ts` instance. */
let firstHome: Promise<void> | null = null

/**
 * Imports the cached `home.ts` instance used by the interaction tests.
 *
 * @returns Nothing; the shell is installed on the first call.
 */
const getHome = () => {
  firstHome ??= importHome(0)

  return firstHome
}

/**
 * Returns an element registered in the stubbed document.
 *
 * @param id - The element's id.
 * @returns The registered element.
 */
const element = (id: string) => domStub.document.getElementById(id)!

/**
 * Tells whether a demo's menu button is currently highlighted.
 *
 * @param demoNumber - The demo number.
 * @returns `true` when the button carries the `active` class.
 */
const isActive = (demoNumber: number) =>
  element(`demo${demoNumber}`).classList.contains('active')

/**
 * Dispatches a click on a demo's menu button.
 *
 * @param demoNumber - The demo number.
 * @returns Nothing; the shell reacts as a side effect.
 */
const clickDemo = (demoNumber: number) => {
  element(`demo${demoNumber}`).dispatchEvent(new FakeEvent('click'))
}

/**
 * Verifies that the shell starts the demo requested through the `demo_id`
 * query parameter and highlights its menu button.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Home - starts the demo requested in the URL', async () => {
  domStub.location.search = '?demo_id=5'
  resetDemoCalls()

  await getHome()

  assertEquals(demoCalls, [{ action: 'start', path: demoPath(5) }])
  assert(isActive(5))
  assertEquals(element('canvas-container').style.display, 'flex')
})

/**
 * Verifies that clicking a menu button stops the previous demo and starts the
 * selected one.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Home - menu buttons switch the demo', async () => {
  await getHome()

  clickDemo(1)
  await flushPromises()

  resetDemoCalls()

  clickDemo(3)
  await flushPromises()

  assertEquals(demoCalls, [
    { action: 'stop', path: demoPath(1) },
    { action: 'start', path: demoPath(3) },
  ])
  assert(isActive(3))
  assertFalse(isActive(1))
})

/**
 * Verifies that the left and right arrow keys move to the previous and next
 * demo, wrapping around the ends.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Home - arrow keys navigate between demos', async () => {
  await getHome()

  clickDemo(1)
  await flushPromises()

  const right = createKeyboardEvent('ArrowRight')
  domStub.document.dispatchEvent(right)
  await flushPromises()

  assert(right.defaultPrevented)
  assert(isActive(2))

  const left = createKeyboardEvent('ArrowLeft')
  domStub.document.dispatchEvent(left)
  await flushPromises()

  assert(left.defaultPrevented)
  assert(isActive(1))

  // Moving left from the first demo wraps around to the last one.
  domStub.document.dispatchEvent(createKeyboardEvent('ArrowLeft'))
  await flushPromises()

  assert(isActive(22))
})

/**
 * Verifies that the digit keys jump straight to a demo.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Home - digit keys jump to a demo', async () => {
  await getHome()

  clickDemo(1)
  await flushPromises()

  const seven = createKeyboardEvent('7')
  domStub.document.dispatchEvent(seven)
  await flushPromises()

  assert(seven.defaultPrevented)
  assert(isActive(7))

  // Digits above 9 are not shortcuts.
  const twenty = createKeyboardEvent('2')
  domStub.document.dispatchEvent(twenty)
  await flushPromises()

  assert(isActive(2))
})

/**
 * Verifies that `Shift` + `ArrowUp`/`ArrowDown` navigate between demos.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Home - Shift + arrow keys navigate between demos', async () => {
  await getHome()

  clickDemo(10)
  await flushPromises()

  const down = createKeyboardEvent('ArrowDown', { shiftKey: true })
  domStub.document.dispatchEvent(down)
  await flushPromises()

  assert(down.defaultPrevented)
  assert(isActive(11))

  domStub.document.dispatchEvent(
    createKeyboardEvent('ArrowUp', { shiftKey: true }),
  )
  await flushPromises()

  assert(isActive(10))
})

/**
 * Verifies that the unshifted arrow keys do not navigate while the Pac-Man
 * demo is selected, because they drive the game.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Home - arrow keys are reserved while Pac-Man is selected', async () => {
  await getHome()

  clickDemo(22)
  await flushPromises()

  const left = createKeyboardEvent('ArrowLeft')
  domStub.document.dispatchEvent(left)
  await flushPromises()

  assertFalse(left.defaultPrevented)
  assert(isActive(22))

  // The shifted shortcut still works, wrapping around to the first demo.
  domStub.document.dispatchEvent(
    createKeyboardEvent('ArrowDown', { shiftKey: true }),
  )
  await flushPromises()

  assert(isActive(1))
})

/**
 * Verifies that the `p` key toggles the paused state of the frame loop.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Home - the p key toggles the pause state', async () => {
  await getHome()

  const pause = createKeyboardEvent('P')
  domStub.document.dispatchEvent(pause)

  assert(pause.defaultPrevented)

  // Toggle back, so the shared pause flag does not leak into other tests.
  domStub.document.dispatchEvent(createKeyboardEvent('p'))
})

/**
 * Verifies that dragging with the primary button rotates the scene.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Home - primary pointer drag rotates the scene', async () => {
  await getHome()
  resetScene()

  const animation = domStub.animation

  animation.dispatchEvent(
    createPointerEvent('pointerdown', {
      button: 0,
      pointerId: 7,
      clientX: 100,
      clientY: 100,
    }),
  )
  animation.dispatchEvent(
    createPointerEvent('pointermove', {
      pointerId: 7,
      clientX: 200,
      clientY: 100,
    }),
  )
  animation.dispatchEvent(
    createPointerEvent('pointerup', {
      pointerId: 7,
      clientX: 200,
      clientY: 100,
    }),
  )

  resetTransformationMatrix()

  // A horizontal drag of 100 px rotates the scene 0.5 rad around the Y-axis.
  const rotated = transform($v(1, 0, 0))

  assertClose(rotated.x, Math.cos(0.5))
  assertClose(rotated.y, 0)
  assertClose(rotated.z, -Math.sin(0.5))
  assertEquals(animation.capturedPointers.size, 0)
})

/**
 * Verifies that dragging with the secondary button pans the scene.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Home - secondary pointer drag pans the scene', async () => {
  await getHome()
  resetScene()

  const animation = domStub.animation
  const before = centralize($v(0, 0, 0))!

  animation.dispatchEvent(
    createPointerEvent('pointerdown', {
      button: 2,
      pointerId: 9,
      clientX: 100,
      clientY: 100,
    }),
  )
  animation.dispatchEvent(
    createPointerEvent('pointermove', {
      pointerId: 9,
      clientX: 200,
      clientY: 150,
    }),
  )
  animation.dispatchEvent(
    createPointerEvent('pointerup', {
      pointerId: 9,
      clientX: 200,
      clientY: 150,
    }),
  )

  const after = centralize($v(0, 0, 0))!

  assertClose(after.x - before.x, 100)
  assertClose(after.y - before.y, 50)
})

/**
 * Verifies that a pointer move from a different pointer is ignored.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Home - pointer moves from other pointers are ignored', async () => {
  await getHome()
  resetScene()

  const animation = domStub.animation
  const before = centralize($v(0, 0, 0))!

  animation.dispatchEvent(
    createPointerEvent('pointerdown', {
      button: 2,
      pointerId: 1,
      clientX: 0,
      clientY: 0,
    }),
  )
  animation.dispatchEvent(
    createPointerEvent('pointermove', {
      pointerId: 2,
      clientX: 500,
      clientY: 500,
    }),
  )
  animation.dispatchEvent(
    createPointerEvent('pointerup', {
      pointerId: 1,
      clientX: 0,
      clientY: 0,
    }),
  )

  assertEquals(centralize($v(0, 0, 0))!.toArray(), before.toArray())
})

/**
 * Verifies that Ctrl/Cmd + wheel zooms the scene.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Home - Ctrl + wheel zooms the scene', async () => {
  await getHome()
  resetScene()

  const wheel = createWheelEvent('wheel', { ctrlKey: true, deltaY: -100 })
  domStub.animation.dispatchEvent(wheel)

  assert(wheel.defaultPrevented)

  resetTransformationMatrix()

  assertClose(transform($v(1, 0, 0)).x, 1.5)
})

/**
 * Verifies that a plain wheel scroll pans the scene.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Home - plain wheel pans the scene', async () => {
  await getHome()
  resetScene()

  const before = centralize($v(0, 0, 0))!
  const wheel = createWheelEvent('wheel', { deltaX: 100, deltaY: 50 })

  domStub.animation.dispatchEvent(wheel)

  assert(wheel.defaultPrevented)

  const after = centralize($v(0, 0, 0))!

  assertClose(after.x - before.x, 50)
  assertClose(after.y - before.y, 25)

  // A wheel event without any delta is ignored.
  const empty = createWheelEvent('wheel')
  domStub.animation.dispatchEvent(empty)

  assertFalse(empty.defaultPrevented)
  assertEquals(centralize($v(0, 0, 0))!.toArray(), after.toArray())
})

/**
 * Verifies that a double click restores the initial camera state.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Home - double click resets the camera', async () => {
  await getHome()
  resetScene()

  const initial = centralize($v(0, 0, 0))!.toArray()

  domStub.animation.dispatchEvent(
    createWheelEvent('wheel', { ctrlKey: true, deltaY: -100 }),
  )
  domStub.animation.dispatchEvent(
    createWheelEvent('wheel', { deltaX: 100, deltaY: 50 }),
  )

  resetTransformationMatrix()
  assert(transform($v(1, 0, 0)).x !== 1)
  assert(centralize($v(0, 0, 0))!.x !== initial[0])

  const doubleClick = new FakeEvent('dblclick')
  domStub.animation.dispatchEvent(doubleClick)

  assert(doubleClick.defaultPrevented)

  resetTransformationMatrix()

  assertClose(transform($v(1, 0, 0)).x, 1)
  assertEquals(centralize($v(0, 0, 0))!.toArray(), initial)
})

/**
 * Verifies that the display checkboxes update the renderer's flags.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Home - display checkboxes update the renderer flags', async () => {
  await getHome()
  resetScene()

  const normals = element('show-normals-checkbox')
  normals.checked = true
  normals.dispatchEvent(new FakeEvent('change'))

  assert(showNormals)

  const axes = element('show-3d-axes-checkbox')
  axes.checked = false
  axes.dispatchEvent(new FakeEvent('change'))

  assertFalse(render3dAxesEnabled)

  const autoRotation = element('enable-auto-rotation-checkbox')
  autoRotation.checked = false
  autoRotation.dispatchEvent(new FakeEvent('change'))

  assertFalse(autoRotationEnabled)

  // The checkboxes start enabled.
  resetScene()

  axes.checked = true
  autoRotation.checked = true
})

/**
 * Verifies that resizing the window resizes the canvas to match its container.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Home - window resize updates the canvas size', async () => {
  await getHome()
  resetScene()

  const container = element('canvas-container')
  const originalRect = container.getBoundingClientRect.bind(container)

  try {
    container.getBoundingClientRect = () => ({
      ...originalRect(),
      width: 640,
      height: 480,
    })

    domStub.document.dispatchEvent(new FakeEvent('resize'))

    assertEquals(domStub.animation.width, 640)
    assertEquals(domStub.animation.height, 480)
  } finally {
    container.getBoundingClientRect = originalRect
    domStub.animation.width = 800
    domStub.animation.height = 600
  }
})

/**
 * Verifies that an unusable `demo_id` query parameter falls back to the first
 * demo.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Home - a missing demo_id falls back to the first demo', async () => {
  domStub.location.search = ''
  resetDemoCalls()

  await importHome(1)

  assertEquals(demoCalls, [{ action: 'start', path: demoPath(1) }])
})

/**
 * Verifies that a non-integer `demo_id` query parameter falls back to the
 * first demo.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Home - a non-integer demo_id falls back to the first demo', async () => {
  domStub.location.search = '?demo_id=2.5'
  resetDemoCalls()

  await importHome(2)

  assertEquals(demoCalls, [{ action: 'start', path: demoPath(1) }])
})

/**
 * Verifies that an out-of-range `demo_id` query parameter falls back to the
 * first demo.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Home - an out-of-range demo_id falls back to the first demo', async () => {
  domStub.location.search = '?demo_id=23'
  resetDemoCalls()

  await importHome(3)

  assertEquals(demoCalls, [{ action: 'start', path: demoPath(1) }])

  domStub.location.search = '?demo_id=0'
  resetDemoCalls()

  await importHome(4)

  assertEquals(demoCalls, [{ action: 'start', path: demoPath(1) }])
})

/**
 * Verifies that the last demo can be selected through the URL.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Home - the URL can select the last demo', async () => {
  domStub.location.search = '?demo_id=22'
  resetDemoCalls()

  await importHome(5)

  assertEquals(demoCalls, [{ action: 'start', path: demoPath(22) }])
  assert(isActive(22))
})
