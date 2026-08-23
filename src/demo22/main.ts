import { FPS } from '../constants.ts';
import { render3dScene, resetTransformationMatrix } from '../primitives.ts';
import { createFrameLoop } from '../utils.ts';
import { Game } from './game.ts';

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

function start() {
  if (!isListeningToKeyboard) {
    document.addEventListener('keydown', game.handleKeydown)
    isListeningToKeyboard = true
  }

  startFrameLoop()
}

function stop() {
  if (isListeningToKeyboard) {
    document.removeEventListener('keydown', game.handleKeydown)
    isListeningToKeyboard = false
  }

  game.stop()
  stopFrameLoop()
}

export { start, stop }
