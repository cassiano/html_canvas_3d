import { FPS } from './../constants'
import { createFrameLoop, fps, millis, togglePause } from './../utils'
import {
  animation,
  background,
  render3dScene,
  render3dAxes,
  resetTransformationMatrix,
  rotateX,
  rotateY,
  text2d,
} from './../primitives'
import { $v } from './../vector'
import { PI, sin } from './../math_utils'
import { RubikCube } from './rubik_cube'
import { CUBIE_SIZE, CUBIES_PER_AXIS } from './constants.ts'

const cube = new RubikCube(CUBIE_SIZE, CUBIES_PER_AXIS)

// -------------------------------------------------------------------------------------------------

animation.onclick = () => togglePause()

const draw = () => {
  // console.log({ fps: fps(), millis: millis(), frameCount: frameCount() })
  console.log({ fps: fps() })

  background('lightGray')

  rotateX(-PI / 5 + sin(millis() / 5000) * 1.5)
  rotateY(millis() / 3000)

  render3dAxes()

  cube.render()
}

const onPaused = () => {
  text2d('PAUSED', $v(0, 300))
}

const { start, stop } = createFrameLoop(
  () => {
    resetTransformationMatrix()
    draw()
    render3dScene()
  },
  onPaused,
  FPS,
)

export { start, stop }
