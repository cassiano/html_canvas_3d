//////////////////////////
// Rotating Sphere Demo //
//////////////////////////

import { FPS } from '../constants.ts'
import { createFrameLoop, fps, millis } from '../utils.ts'
import {
  background,
  render3dScene,
  render3dAxes,
  resetTransformationMatrix,
  text2d,
} from '../primitives.ts'
import { $v } from '../vector_3d.ts'
import { PI } from '../math_utils.ts'
import { rotateZ } from '../primitives.ts'
import {
  rotateX,
  cone,
  rotateY,
  translate,
  isolateTransformations,
} from '../primitives.ts'

// -------------------------------------------------------------------------------------------------

const draw = () => {
  // console.log({ fps: fps(), millis: millis(), frameCount: frameCount() })
  console.log({ fps: fps() })

  background('lightGray')

  rotateX(PI / 4)
  rotateY(-millis() / 2000)

  render3dAxes()

  const RADIUS = 100
  const HEIGHT = 250
  const OPACITY = 1

  isolateTransformations(() => {
    translate(0, HEIGHT / 2, 0)

    cone(RADIUS, HEIGHT, {
      color: 'orange',
      opacity: OPACITY,
    })
  })

  isolateTransformations(() => {
    translate(0, -HEIGHT / 2, 0)
    rotateX(PI)

    cone(RADIUS, HEIGHT, {
      color: 'brown',
      opacity: OPACITY,
    })
  })

  isolateTransformations(() => {
    translate(HEIGHT / 2, 0, 0)
    rotateZ(-PI / 2)

    cone(RADIUS, HEIGHT, {
      color: 'yellow',
      opacity: OPACITY,
    })
  })

  isolateTransformations(() => {
    translate(-HEIGHT / 2, 0, 0)
    rotateZ(PI / 2)

    cone(RADIUS, HEIGHT, {
      color: 'pink',
      opacity: OPACITY,
    })
  })

  isolateTransformations(() => {
    translate(0, 0, HEIGHT / 2)
    rotateX(PI / 2)

    cone(RADIUS, HEIGHT, {
      color: 'lime',
      opacity: OPACITY,
    })
  })

  isolateTransformations(() => {
    translate(0, 0, -HEIGHT / 2)
    rotateX(-PI / 2)

    cone(RADIUS, HEIGHT, {
      color: 'magenta',
      opacity: OPACITY,
    })
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
