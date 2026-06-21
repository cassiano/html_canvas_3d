//////////////////////
// Coral Snake Demo //
//////////////////////

import { FPS, FPS_LOGGING_FRAME_FREQUENCY } from '../constants.ts'
import { createFrameLoop, frameCount, fps } from '../utils.ts'
import {
  background,
  render3dScene,
  resetTransformationMatrix,
  text2d,
} from '../primitives.ts'
import { $v } from '../vector_3d.ts'
import { random } from '../math_utils.ts'
import { Fireworks } from './fireworks.ts'

// -------------------------------------------------------------------------------------------------

const GRAVITY = 0.018
const gravity = $v(0, -GRAVITY, 0)

// -------------------------------------------------------------------------------------------------

const draw = () => {
  // console.log({ fps: fps(), millis: millis(), frameCount: frameCount() })
  if (frameCount() % FPS_LOGGING_FRAME_FREQUENCY === 0)
    console.log({ fps: fps() })

  background('lightGray')

  if (random() < 1 / 100) Fireworks.create(850, 850)

  Fireworks.reversedForEach((fireworks, i) => {
    fireworks.applyForce(gravity)
    fireworks.run()

    if (fireworks.isDead()) Fireworks.destroy(i)
  })
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
