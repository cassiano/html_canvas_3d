//////////////////////////
// Rotating Sphere Demo //
//////////////////////////

import { FPS, ORIGIN } from '../constants.ts'
import { createFrameLoop, fps, togglePause, millis } from '../utils.ts'
import {
  animation,
  background,
  render3dScene,
  render3dAxes,
  resetTransformationMatrix,
  text2d,
} from '../primitives.ts'
import { $v } from '../vector_3d.ts'
import { PI } from '../math_utils.ts'
import { rotateX, arrow, rotateY } from '../primitives.ts'

// -------------------------------------------------------------------------------------------------

animation.onclick = () => togglePause()

const draw = () => {
  // console.log({ fps: fps(), millis: millis(), frameCount: frameCount() })
  console.log({ fps: fps() })

  background('lightGray')

  rotateX(PI / 4)
  rotateY(-millis() / 2000)

  render3dAxes()

  arrow($v(-150, -150, -150), $v(-50, -50, -50), {
    color: 'magenta',
    tipHeight: 10,
    tipRadius: 5,
  })
  arrow($v(50, 50, 50), $v(150, 150, 150), {
    color: 'magenta',
    tipHeight: 10,
    tipRadius: 5,
  })

  arrow($v(-150, 150, -150), $v(-50, 50, -50), {
    color: 'magenta',
    tipHeight: 10,
    tipRadius: 5,
  })
  arrow($v(50, -50, 50), $v(150, -150, 150), {
    color: 'magenta',
    tipHeight: 10,
    tipRadius: 5,
  })

  arrow($v(-150, -150, 150), $v(-50, -50, 50), {
    color: 'brown',
    tipHeight: 10,
    tipRadius: 5,
  })
  arrow($v(50, 50, -50), $v(150, 150, -150), {
    color: 'brown',
    tipHeight: 10,
    tipRadius: 5,
  })

  arrow($v(-150, 150, 150), $v(-50, 50, 50), {
    color: 'brown',
    tipHeight: 10,
    tipRadius: 5,
  })
  arrow($v(50, -50, -50), $v(150, -150, -150), {
    color: 'brown',
    tipHeight: 10,
    tipRadius: 5,
  })

  arrow(ORIGIN, $v(100, 0, 0), {
    color: 'black',
    tipHeight: 10,
    tipRadius: 5,
  })
  arrow(ORIGIN, $v(0, 100, 0), {
    color: 'black',
    tipHeight: 10,
    tipRadius: 5,
  })
  arrow(ORIGIN, $v(0, 0, 100), {
    color: 'black',
    tipHeight: 10,
    tipRadius: 5,
  })

  arrow(ORIGIN, $v(-100, 0, 0), {
    color: 'black',
    tipHeight: 10,
    tipRadius: 5,
  })
  arrow(ORIGIN, $v(0, -100, 0), {
    color: 'black',
    tipHeight: 10,
    tipRadius: 5,
  })
  arrow(ORIGIN, $v(0, 0, -100), {
    color: 'black',
    tipHeight: 10,
    tipRadius: 5,
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
