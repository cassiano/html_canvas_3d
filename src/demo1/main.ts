import { FPS } from '../constants'
import { createFrameLoop, fps, millis, togglePause } from '../utils'
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
} from '../primitives'
import { $v } from '../vector'
import { PI } from '../math_utils'
import { CubeSphereMover } from './cube_sphere_mover.ts'

const DEPTH = 2000
const GRAVITY = 0.1
const deltaAngle = (2 * PI) / 1e3
const gravity = $v(0, -GRAVITY, 0)
// const mover = new CubeMover(10, 0, 0, 0, 100)
// const mover = new SphereMover(10, 0, 300, 0, 100)
const mover = new CubeSphereMover(10, 0, 300, 0, 100)
const weight = gravity.mult(mover.mass, false)

// -------------------------------------------------------------------------------------------------

animation.onclick = () => togglePause()

const draw = () => {
  // console.log({ fps: fps(), millis: millis(), frameCount: frameCount() })
  console.log({ fps: fps() })

  background('lightGray')

  rotateX(-PI / 3)
  rotateY(PI / 12 + millis() / 2000)

  render3dAxes()

  isolateTransformations(() => {
    translate(0, -DEPTH, 0)

    planeXZ(500, 500, { color: 'yellow' })
  })

  mover.render()

  // Do the physics and animation updates.
  mover.update(DEPTH)
  mover.checkEdges(DEPTH)
  mover.applyForce(weight)
}

const onPaused = () => {
  text2d('PAUSED', $v(0, 300))
}

const { start, stop } = createFrameLoop(
  () => {
    resetTransformationMatrix()
    draw()
    processDeferredRenders()
  },
  onPaused,
  FPS,
)

export { start, stop }
