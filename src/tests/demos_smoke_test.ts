/// <reference lib="deno.ns" />

// To execute tests, run:
//
// `deno test`
// `deno test --watch`

import './dom_stub.ts'
import {
  assert,
  assertEquals,
  assertExists,
  assertGreater,
  assertGreaterOrEqual,
  assertLessOrEqual,
} from '@std/assert'
import { flushAnimationFrames, pendingAnimationFrames } from './dom_stub.ts'
import { documentStub, recordingContext, resetScene } from './test_helpers.ts'
import { render3dScene } from '../primitives.ts'

/**
 * Alias for `Deno.test`, used to register the test cases in this file.
 */
const test = Deno.test

/**
 * The number of animation frames flushed after a demo has been started.
 */
const FRAMES_PER_DEMO = 10

/**
 * The number of milliseconds between two consecutive animation frames.
 */
const FRAME_STEP = 16

/**
 * The number of frames flushed after a demo has been stopped, used to check
 * that the demo's frame loop is really over.
 */
const FRAMES_AFTER_STOP = 5

/**
 * The lifecycle API that every demo module exposes.
 */
interface DemoModule {
  /** Starts the demo's animation frame loop. */
  start: () => void
  /** Stops the demo's animation frame loop. */
  stop: () => void
}

/**
 * A demo covered by this test file.
 */
interface DemoEntry {
  /** The demo's number. */
  number: number
  /** The path of the demo's entry point, relative to this test file. */
  path: string
  /**
   * The number of control widgets held by the demo's control panel while the
   * demo is running, or `0` when the demo has no control panel at all.
   */
  widgets: number
  /**
   * The loaders of the demo's module.
   *
   * Every loader uses a cache-busting query string, so that it returns a
   * brand new instance of the module, with its own module-level state,
   * instead of the instance cached by a previous import. The instances are
   * independent from each other, so that the test cases of a demo cannot
   * interfere with one another.
   */
  loaders: {
    /** Loads the instance used to inspect the module's exports. */
    exports: () => Promise<DemoModule>
    /** Loads the instance used to exercise the module's lifecycle. */
    lifecycle: () => Promise<DemoModule>
    /** Loads the instance used to check what the module paints. */
    rendering: () => Promise<DemoModule>
  }
}

/**
 * The demos covered by this test file.
 *
 * The table is the single source of truth of the suite: adding a demo to it
 * is enough to have it checked by every test case below.
 */
const DEMOS: DemoEntry[] = [
  {
    number: 2,
    path: '../demo2/main.ts',
    widgets: 0,
    loaders: {
      exports: () => import('../demo2/main.ts?case=demo2-exports'),
      lifecycle: () => import('../demo2/main.ts?case=demo2-lifecycle'),
      rendering: () => import('../demo2/main.ts?case=demo2-rendering'),
    },
  },
  {
    number: 5,
    path: '../demo5/main.ts',
    widgets: 2,
    loaders: {
      exports: () => import('../demo5/main.ts?case=demo5-exports'),
      lifecycle: () => import('../demo5/main.ts?case=demo5-lifecycle'),
      rendering: () => import('../demo5/main.ts?case=demo5-rendering'),
    },
  },
  {
    number: 6,
    path: '../demo6/main.ts',
    widgets: 0,
    loaders: {
      exports: () => import('../demo6/main.ts?case=demo6-exports'),
      lifecycle: () => import('../demo6/main.ts?case=demo6-lifecycle'),
      rendering: () => import('../demo6/main.ts?case=demo6-rendering'),
    },
  },
  {
    number: 7,
    path: '../demo7/main.ts',
    widgets: 0,
    loaders: {
      exports: () => import('../demo7/main.ts?case=demo7-exports'),
      lifecycle: () => import('../demo7/main.ts?case=demo7-lifecycle'),
      rendering: () => import('../demo7/main.ts?case=demo7-rendering'),
    },
  },
  {
    number: 8,
    path: '../demo8/main.ts',
    widgets: 0,
    loaders: {
      exports: () => import('../demo8/main.ts?case=demo8-exports'),
      lifecycle: () => import('../demo8/main.ts?case=demo8-lifecycle'),
      rendering: () => import('../demo8/main.ts?case=demo8-rendering'),
    },
  },
  {
    number: 9,
    path: '../demo9/main.ts',
    widgets: 0,
    loaders: {
      exports: () => import('../demo9/main.ts?case=demo9-exports'),
      lifecycle: () => import('../demo9/main.ts?case=demo9-lifecycle'),
      rendering: () => import('../demo9/main.ts?case=demo9-rendering'),
    },
  },
  {
    number: 11,
    path: '../demo11/main.ts',
    widgets: 0,
    loaders: {
      exports: () => import('../demo11/main.ts?case=demo11-exports'),
      lifecycle: () => import('../demo11/main.ts?case=demo11-lifecycle'),
      rendering: () => import('../demo11/main.ts?case=demo11-rendering'),
    },
  },
  {
    number: 12,
    path: '../demo12/main.ts',
    widgets: 1,
    loaders: {
      exports: () => import('../demo12/main.ts?case=demo12-exports'),
      lifecycle: () => import('../demo12/main.ts?case=demo12-lifecycle'),
      rendering: () => import('../demo12/main.ts?case=demo12-rendering'),
    },
  },
  {
    number: 13,
    path: '../demo13/main.ts',
    widgets: 0,
    loaders: {
      exports: () => import('../demo13/main.ts?case=demo13-exports'),
      lifecycle: () => import('../demo13/main.ts?case=demo13-lifecycle'),
      rendering: () => import('../demo13/main.ts?case=demo13-rendering'),
    },
  },
  {
    number: 14,
    path: '../demo14/main.ts',
    widgets: 0,
    loaders: {
      exports: () => import('../demo14/main.ts?case=demo14-exports'),
      lifecycle: () => import('../demo14/main.ts?case=demo14-lifecycle'),
      rendering: () => import('../demo14/main.ts?case=demo14-rendering'),
    },
  },
  {
    number: 15,
    path: '../demo15/main.ts',
    widgets: 4,
    loaders: {
      exports: () => import('../demo15/main.ts?case=demo15-exports'),
      lifecycle: () => import('../demo15/main.ts?case=demo15-lifecycle'),
      rendering: () => import('../demo15/main.ts?case=demo15-rendering'),
    },
  },
  {
    number: 16,
    path: '../demo16/main.ts',
    widgets: 0,
    loaders: {
      exports: () => import('../demo16/main.ts?case=demo16-exports'),
      lifecycle: () => import('../demo16/main.ts?case=demo16-lifecycle'),
      rendering: () => import('../demo16/main.ts?case=demo16-rendering'),
    },
  },
  {
    number: 18,
    path: '../demo18/main.ts',
    widgets: 1,
    loaders: {
      exports: () => import('../demo18/main.ts?case=demo18-exports'),
      lifecycle: () => import('../demo18/main.ts?case=demo18-lifecycle'),
      rendering: () => import('../demo18/main.ts?case=demo18-rendering'),
    },
  },
  {
    number: 19,
    path: '../demo19/main.ts',
    widgets: 0,
    loaders: {
      exports: () => import('../demo19/main.ts?case=demo19-exports'),
      lifecycle: () => import('../demo19/main.ts?case=demo19-lifecycle'),
      rendering: () => import('../demo19/main.ts?case=demo19-rendering'),
    },
  },
  {
    number: 20,
    path: '../demo20/main.ts',
    widgets: 0,
    loaders: {
      exports: () => import('../demo20/main.ts?case=demo20-exports'),
      lifecycle: () => import('../demo20/main.ts?case=demo20-lifecycle'),
      rendering: () => import('../demo20/main.ts?case=demo20-rendering'),
    },
  },
]

/**
 * The timestamp of the next animation frame to be flushed.
 *
 * The frame loop throttles the frames it draws to the target frame rate,
 * comparing the timestamp of the incoming frame with the timestamp of the
 * last drawn one. That state is shared by every demo, so the clock is
 * advanced between two demos, guaranteeing that the first frame of a demo is
 * always drawn.
 */
let frameClock = 0

/**
 * Advances the animation frame clock.
 *
 * @returns The timestamp of the first frame of the next demo.
 */
const nextFrameTime = () => {
  frameClock += 1000

  return frameClock
}

/**
 * Resets the renderer and the stubbed browser environment, so that a demo
 * always starts from a known baseline.
 *
 * The renderer's deferred render list is flushed first, so that the shapes
 * queued by the previous demo cannot leak into the next one. The children of
 * the canvas container are dropped as well, because the stub's own reset only
 * empties the body of the document.
 *
 * @returns Nothing; the function only resets the shared state.
 */
const resetBetweenDemos = () => {
  render3dScene()

  resetScene()

  const canvasContainer = documentStub().getElementById('canvas-container')

  if (canvasContainer) canvasContainer.children.length = 0
}

/**
 * Returns the element hosting the demos' canvas and control panels.
 *
 * @returns The canvas container element.
 */
const canvasContainerElement = () => {
  const canvasContainer = documentStub().getElementById('canvas-container')

  assertExists(canvasContainer, 'the canvas container should be registered')

  return canvasContainer
}

/**
 * Asserts that a function does not throw.
 *
 * The `@std/assert` module does not provide a counterpart of
 * `assertThrows` for the "nothing was thrown" case, so the check is
 * implemented locally.
 *
 * @param fn - The function to call.
 * @param message - The message of the assertion error.
 * @returns Nothing; the function throws an `Error` when `fn` throws.
 * @throws {Error} When `fn` throws.
 */
const assertDoesNotThrow = (fn: () => void, message?: string) => {
  try {
    fn()
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)

    throw new Error(
      `${message ?? 'The function should not have thrown'}: ${reason}`,
    )
  }
}

// --- The demos' lifecycle contract ---

for (const demo of DEMOS) {
  /**
   * Verifies that the demo's module exposes a `start` and a `stop` function,
   * so that the demo loader is able to drive the demo's lifecycle.
   *
   * @returns Nothing; the test fails by throwing an assertion error when the
   *   expected behaviour is not met.
   * @throws {Error} When an assertion fails.
   */
  test(`Demo ${demo.number} - exposes a start and a stop function`, async () => {
    const demoModule = await demo.loaders.exports()

    assertEquals(typeof demoModule.start, 'function')
    assertEquals(typeof demoModule.stop, 'function')
  })

  /**
   * Verifies that the demo can be started and stopped without throwing, that
   * it draws nothing once stopped, and that it creates and removes its
   * control panel, when it has one.
   *
   * @returns Nothing; the test fails by throwing an assertion error when the
   *   expected behaviour is not met.
   * @throws {Error} When an assertion fails.
   */
  test(
    `Demo ${demo.number} - starts and stops without throwing`,
    async () => {
      resetBetweenDemos()

      const demoModule = await demo.loaders.lifecycle()
      const canvasContainer = canvasContainerElement()

      assertEquals(canvasContainer.children.length, 0)

      assertDoesNotThrow(() => demoModule.start())

      if (demo.widgets > 0) {
        assertEquals(canvasContainer.children.length, 1)

        const panel = canvasContainer.children[0]

        assertEquals(panel.children.length, demo.widgets)
      } else {
        assertEquals(canvasContainer.children.length, 0)
      }

      assertDoesNotThrow(() => demoModule.stop())

      assertEquals(canvasContainer.children.length, 0)

      // The frame loop only tracks the handle of the frame it draws, so the
      // frame requested by `start()` may still be pending. Running it must not
      // draw anything, nor schedule a new frame.
      const timestamps = flushAnimationFrames(
        FRAMES_AFTER_STOP,
        nextFrameTime(),
        FRAME_STEP,
      )

      assertLessOrEqual(timestamps.length, 1)
      assertEquals(recordingContext().calls.length, 0)
      assertEquals(pendingAnimationFrames.size, 0)
    },
  )

  /**
   * Verifies that the demo paints on the canvas while its frame loop is
   * running, and that it stops painting once it has been stopped.
   *
   * @returns Nothing; the test fails by throwing an assertion error when the
   *   expected behaviour is not met.
   * @throws {Error} When an assertion fails.
   */
  test(
    `Demo ${demo.number} - paints while running and stops painting once stopped`,
    async () => {
      resetBetweenDemos()

      const demoModule = await demo.loaders.rendering()

      demoModule.start()

      const timestamps = flushAnimationFrames(
        FRAMES_PER_DEMO,
        nextFrameTime(),
        FRAME_STEP,
      )

      assertEquals(timestamps.length, FRAMES_PER_DEMO)
      assertGreater(recordingContext().calls.length, 0)

      // Every demo clears the canvas with a background colour and fills the
      // shapes of its scene on every frame.
      assertGreaterOrEqual(
        recordingContext().callsOf('fillRect').length,
        FRAMES_PER_DEMO,
      )
      assertGreater(recordingContext().callsOf('fill').length, 0)

      const callsBeforeStop = recordingContext().calls.length

      demoModule.stop()

      assertEquals(pendingAnimationFrames.size, 0)

      const timestampsAfterStop = flushAnimationFrames(
        FRAMES_AFTER_STOP,
        nextFrameTime(),
        FRAME_STEP,
      )

      assertEquals(timestampsAfterStop.length, 0)
      assertEquals(recordingContext().calls.length, callsBeforeStop)
    },
  )
}

// --- The global consistency contract ---

/**
 * Verifies that the demo table covers exactly the demos this test file is
 * responsible for, so that a demo cannot silently escape the suite.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Demos - the table covers every demo in scope', () => {
  assertEquals(
    DEMOS.map(demo => demo.number),
    [2, 5, 6, 7, 8, 9, 11, 12, 13, 14, 15, 16, 18, 19, 20],
  )

  DEMOS.forEach(demo => {
    assert(demo.path.startsWith('../'), 'the demo path should be relative')
    assert(demo.path.endsWith('/main.ts'), 'the demo path should be a main')
    assertGreaterOrEqual(demo.widgets, 0)
  })
})

/**
 * Verifies that every demo of the project exposes the same lifecycle API,
 * namely a `start` and a `stop` function, so that the demo loader can drive
 * all of them in the same way.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Demos - every demo exposes the same lifecycle API', async () => {
  for (const demo of DEMOS) {
    const demoModule = await demo.loaders.exports()

    assertEquals(
      typeof demoModule.start,
      'function',
      `demo ${demo.number} should export a start function`,
    )
    assertEquals(
      typeof demoModule.stop,
      'function',
      `demo ${demo.number} should export a stop function`,
    )
  }
})
