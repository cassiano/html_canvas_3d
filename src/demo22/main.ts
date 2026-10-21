//////////////////////
// AI-assisted code //
//////////////////////

import { FPS } from '../constants.ts'
import { render3dScene, resetTransformationMatrix } from '../primitives.ts'
import { createFrameLoop } from '../utils.ts'
import { Game } from './game.ts'

const game = new Game()

const { start: startFrameLoop, stop: stopFrameLoop } = createFrameLoop(
  () => {
    resetTransformationMatrix()
    game.drawFrame()
    render3dScene()
  },
  () => {
    game.renderPaused()
  },
  FPS,
)

let isListeningToKeyboard = false

// The keydown listener is registered in the capture phase so the game can
// stopImmediatePropagation() while high-score initials are being typed,
// keeping home.ts shortcuts (digits, 'p', shift+arrows) out of the way.
const KEY_EVENT_OPTIONS: AddEventListenerOptions = { capture: true }

// Canvas fillText never triggers a webfont download by itself, so the font is
// requested explicitly once; until it resolves, frames render with the
// monospace fallback declared after 'Press Start 2P' in the font stacks.
let fontLoadPromise: Promise<unknown> | null = null

/**
 * Requests the arcade webfont used by the HUD and the overlay screens.
 *
 * The request is memoised, so repeated calls reuse the same promise instead
 * of issuing additional network requests. Until the promise settles, the
 * canvas falls back to the monospace font declared after `'Press Start 2P'`
 * in the font stacks.
 *
 * @returns A promise that settles when the font request completes.
 */
function loadPressStart2P() {
  if (fontLoadPromise === null)
    fontLoadPromise = document.fonts.load('16px "Press Start 2P"')

  return fontLoadPromise
}

/**
 * Starts the Pac-Man demo.
 *
 * Registers the keyboard listener that steers Pac-Man, requests the arcade
 * webfont, and starts the animation frame loop that drives the game. Calling
 * this function more than once is safe: the keyboard listener is only
 * registered once.
 *
 * @returns Nothing; the function has side effects on the document and on the
 *   animation frame loop.
 */
function start() {
  if (!isListeningToKeyboard) {
    document.addEventListener('keydown', game.handleKeydown, KEY_EVENT_OPTIONS)
    isListeningToKeyboard = true
  }

  loadPressStart2P()

  startFrameLoop()
}

/**
 * Stops the Pac-Man demo.
 *
 * Removes the keyboard listener, silences the power-mode siren, and ends the
 * animation frame loop. Calling this function when the demo is not running
 * is safe: every cleanup step is idempotent.
 *
 * @returns Nothing; the function has side effects on the document, on the
 *   audio subsystem, and on the animation frame loop.
 */
function stop() {
  if (isListeningToKeyboard) {
    document.removeEventListener(
      'keydown',
      game.handleKeydown,
      KEY_EVENT_OPTIONS,
    )
    isListeningToKeyboard = false
  }

  game.stop()
  stopFrameLoop()
}

/**
 * The lifecycle hooks called by the host page when the demo is selected or
 * deselected.
 */
export { start, stop }
