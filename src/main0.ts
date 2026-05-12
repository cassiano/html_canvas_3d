import { DEPTH, GRAVITY } from './constants'
import { createFrameLoop, millis, togglePause } from './utils'
import {
  animation,
  background,
  isolateTransformations,
  planeXZ,
  processDeferredRenders,
  render3dAxes,
  resetTransformationMatrix,
  rotateX,
  rotateY,
  text2d,
  translate,
} from './primitives'
import { $v } from './vector'
import { CubeSphereMover } from './cube_sphere_mover'
import { PI } from './math_utils'

animation.onclick = () => togglePause()

const deltaAngle = (2 * PI) / 1e3
const gravity = $v(0, -GRAVITY, 0)
// const mover = new CubeMover(10, 0, 0, 0, 100)
// const mover = new SphereMover(10, 0, 300, 0, 100)
const mover = new CubeSphereMover(10, 0, 300, 0, 100)
const weight = gravity.mult(mover.mass, false)

let yAngle = 0

const draw = () => {
  // console.log({ fps: fps(), millis: millis(), frameCount: frameCount() })

  background('lightGray')

  rotateX(-PI / 3)
  rotateY(PI / 12 + yAngle)

  render3dAxes()

  isolateTransformations(() => {
    translate(0, -DEPTH, 0)

    planeXZ(500, 500, { color: 'violet' })
  })

  mover.render({
    xAngle: millis() / 3000,
    yAngle: millis() / 3000,
    zAngle: millis() / 3000,
  })

  // Do the physics and animation updates.
  mover.update(DEPTH)
  mover.checkEdges(DEPTH)
  mover.applyForce(weight)

  yAngle += deltaAngle
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
  120,
)

// Start the animation loop.
requestAnimationFrame(frame)
