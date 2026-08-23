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

function start() {
  if (!isListeningToKeyboard) {
    document.addEventListener('keydown', game.handleKeydown, KEY_EVENT_OPTIONS)
    isListeningToKeyboard = true
  }

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
