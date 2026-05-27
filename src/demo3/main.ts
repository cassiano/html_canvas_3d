/////////////////////
// Rubik Cube Demo //
/////////////////////

import { FPS } from './../constants.ts'
import { createFrameLoop, fps, millis } from './../utils.ts'
import {
  background,
  render3dScene,
  render3dAxes,
  resetTransformationMatrix,
  rotateX,
  rotateY,
  text2d,
} from './../primitives.ts'
import { $v } from '../vector_3d.ts'
import { sin } from './../math_utils.ts'
import { RubikCube } from './rubik_cube.ts'
import { CUBIE_SIZE, CUBIES_PER_AXIS } from './constants.ts'
import { frameCount } from '../utils.ts'
import { FPS_LOGGING_FRAME_FREQUENCY } from '../constants.ts'

const cube = new RubikCube(CUBIE_SIZE, CUBIES_PER_AXIS)

// -------------------------------------------------------------------------------------------------

const draw = () => {
  // console.log({ fps: fps(), millis: millis(), frameCount: frameCount() })
  if (frameCount() % FPS_LOGGING_FRAME_FREQUENCY === 0)
    console.log({ fps: fps() })

  background('lightGray')

  rotateX(sin(millis() / 5000) * 1.5)
  rotateY(-millis() / 2000)

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
