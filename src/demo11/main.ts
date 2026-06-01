/////////////////
// Sphere Demo //
/////////////////

import { FPS, FPS_LOGGING_FRAME_FREQUENCY } from '../constants.ts'
import { createFrameLoop, fps, frameCount, millis } from '../utils.ts'
import {
  background,
  render3dScene,
  render3dAxes,
  resetTransformationMatrix,
  text2d,
} from '../primitives.ts'
import { $v } from '../vector_3d.ts'
import { PI } from '../math_utils.ts'
import {
  rotateZ,
  isolateTransformations,
  ring,
  rotateY,
} from '../primitives.ts'
import { rotateX, cylinder, translate } from '../primitives.ts'

const CYLINDER = { radius: 100, height: 100 }
const ELBOW_CIRCLE_SLICES = 16

// -------------------------------------------------------------------------------------------------

const draw = () => {
  // console.log({ fps: fps(), millis: millis(), frameCount: frameCount() })
  if (frameCount() % FPS_LOGGING_FRAME_FREQUENCY === 0)
    console.log({ fps: fps() })

  background('lightGray')

  rotateX(PI / 4)
  rotateY(-millis() / 2000)

  render3dAxes()

  cylinder(CYLINDER.radius, CYLINDER.height, { color: 'indianred' })

  for (let theta = 0; theta < PI / 2; theta += PI / 2 / ELBOW_CIRCLE_SLICES) {
    isolateTransformations(() => {
      const elbowRadius = 2 * CYLINDER.radius
      const ringHeight = (2 * PI * elbowRadius) / 4 / ELBOW_CIRCLE_SLICES // (2.π.R)/4 = 1/4 of circle perimeter.

      translate(CYLINDER.radius, CYLINDER.height / 2, 0)
      rotateZ(-theta)
      translate(-CYLINDER.radius, ringHeight / 2, 0)
      rotateX(-PI / 2)

      ring(CYLINDER.radius, ringHeight, {
        color: 'indianred',
      })
    })
  }

  translate(
    CYLINDER.radius + CYLINDER.height / 2,
    CYLINDER.radius + CYLINDER.height / 2,
    0,
  )
  rotateZ(PI / 2)
  cylinder(CYLINDER.radius, CYLINDER.height, { color: 'indianred' })
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
