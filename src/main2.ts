import { CUBIE_SIZE, CUBIES_PER_AXIS, FPS } from './constants'
import { createFrameLoop, millis, togglePause } from './utils'
import {
  animation,
  background,
  processDeferredRenders,
  render3dAxes,
  resetTransformationMatrix,
  rotateX,
  rotateY,
  text2d,
} from './primitives'
import { $v } from './vector'
import { RubikCube } from './rubik_cube'
import { PI, sin } from './math_utils'

animation.onclick = () => togglePause()

const cube = new RubikCube(CUBIE_SIZE, CUBIES_PER_AXIS)

const draw = () => {
  // console.log({ fps: fps(), millis: millis(), frameCount: frameCount() })

  background('lightGray')

  rotateX(-PI / 5 + sin(millis() / 5000) * 1.5)
  rotateY(PI / 12 + millis() / 3000)

  render3dAxes()

  cube.render()
}

const onPaused = () => {
  text2d('PAUSED', $v(0, 300))
}

const frame = createFrameLoop(
  () => {
    resetTransformationMatrix()
    draw()
    processDeferredRenders()
  },
  onPaused,
  FPS,
)

// Start the animation loop.
requestAnimationFrame(frame)
