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

function loadPressStart2P() {
  if (fontLoadPromise === null)
    fontLoadPromise = document.fonts.load('16px "Press Start 2P"')

  return fontLoadPromise
}

function start() {
  if (!isListeningToKeyboard) {
    document.addEventListener('keydown', game.handleKeydown, KEY_EVENT_OPTIONS)
    isListeningToKeyboard = true
  }

  loadPressStart2P()

  startFrameLoop()
}

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

export { start, stop }
