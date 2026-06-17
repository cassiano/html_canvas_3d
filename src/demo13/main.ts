////////////////
// Torus Demo //
////////////////

import { FPS, FPS_LOGGING_FRAME_FREQUENCY } from '../constants.ts'
import { createFrameLoop, fps, frameCount, millis } from '../utils.ts'
import {
  background,
  render3dScene,
  render3dAxes,
  resetTransformationMatrix,
  text2d,
  rotateY,
} from '../primitives.ts'
import { $v } from '../vector_3d.ts'
import { ElbowShapeOptions } from '../elbow_primitives.ts'
import { torus, rotateX, isolateTransformations } from '../primitives.ts'
import { PI } from '../math_utils.ts'

// -------------------------------------------------------------------------------------------------

const COLOR = 'tomato'
const CIRCLE_SEGMENTS = 36
const TORUS_CIRCLE_SEGMENTS = 72
const OPACITY = 0.5
const RADIUS = 100
const TUBE_RADIUS = 50
const CIRCLE_SLICES = 32

const options1: ElbowShapeOptions = {
  color: COLOR,
  opacity: OPACITY,
  elbowCircleSlices: CIRCLE_SLICES,
  circleSegments: CIRCLE_SEGMENTS,
}

const options2: ElbowShapeOptions = {
  ...options1,
  color: 'seagreen',
}
const options3: ElbowShapeOptions = {
  ...options1,
  color: 'steelblue',
}

// -------------------------------------------------------------------------------------------------

const draw = () => {
  // console.log({ fps: fps(), millis: millis(), frameCount: frameCount() })
  if (frameCount() % FPS_LOGGING_FRAME_FREQUENCY === 0)
    console.log({ fps: fps() })

  background('lightGray')

  rotateX(PI / 4)
  rotateY(-millis() / 2000)

  render3dAxes()

  isolateTransformations(() => {
    rotateY(-millis() / 2000)

    torus(RADIUS, TUBE_RADIUS, TORUS_CIRCLE_SEGMENTS, options1)
  })

  isolateTransformations(() => {
    rotateY(-millis() / 2500)

    torus(
      RADIUS + TUBE_RADIUS * 2,
      TUBE_RADIUS,
      TORUS_CIRCLE_SEGMENTS,
      options2,
    )
  })

  isolateTransformations(() => {
    rotateY(-millis() / 1500)

    torus(0, RADIUS / 2, TORUS_CIRCLE_SEGMENTS, options3)
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
