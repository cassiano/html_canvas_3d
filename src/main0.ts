import { DEPTH, FPS, GRAVITY } from './constants'
import { createFrameLoop, millis, togglePause } from './utils'
import {
  animation,
  background,
  cube,
  isolateTransformations,
  planeXZ,
  processDeferredRenders,
  render3dAxes,
  resetTransformationMatrix,
  rotateX,
  rotateY,
  rotateZ,
  sphere,
  text2d,
  translate,
} from './primitives'
import { $v, Vector } from './vector'
import { PI } from './math_utils'

class Mover3D {
  position: Vector
  velocity: Vector
  acceleration: Vector

  constructor(
    public mass: number,
    x: number,
    y: number,
    z: number,
  ) {
    this.position = $v(x, y, z)
    this.velocity = $v(0, 0, 0)
    this.acceleration = $v(0, 0, 0)
  }

  update(depth: number) {
    this.position.add(this.velocity)

    if (!this.touchedBottom(depth)) this.velocity.add(this.acceleration)

    this.acceleration.mult(0)
  }

  // F = m x a  => a = F / m
  applyForce(force: Vector) {
    this.addAcceleration(force.div(this.mass, false))
  }

  addAcceleration(acceleration: Vector) {
    this.acceleration.add(acceleration)
  }

  render({
    xAngle,
    yAngle,
    zAngle,
  }: { xAngle?: number; yAngle?: number; zAngle?: number } = {}) {
    throw new Error('Not implemented')
  }

  distanceFromCenterToBorder(): number {
    throw new Error('Not implemented')
  }

  touchedBottom(depth: number) {
    return -this.position.y + this.distanceFromCenterToBorder() > depth
  }

  checkEdges(depth: number) {
    if (this.touchedBottom(depth)) this.velocity.y *= -1
  }
}

class CubeMover extends Mover3D {
  constructor(
    mass: number,
    x: number,
    y: number,
    z: number,
    public size: number,
  ) {
    super(mass, x, y, z)
  }

  distanceFromCenterToBorder() {
    return this.size / 2
  }

  render({
    xAngle,
    yAngle,
    zAngle,
  }: { xAngle?: number; yAngle?: number; zAngle?: number } = {}) {
    isolateTransformations(() => {
      translate(this.position)

      if (xAngle !== undefined) rotateX(xAngle)
      if (yAngle !== undefined) rotateY(yAngle)
      if (zAngle !== undefined) rotateZ(zAngle)

      cube(this.size, { color: 'orange' })
    })
  }
}

class SphereMover extends Mover3D {
  constructor(
    mass: number,
    x: number,
    y: number,
    z: number,
    public radius: number,
  ) {
    super(mass, x, y, z)
  }

  distanceFromCenterToBorder() {
    return this.radius
  }

  render({
    xAngle,
    yAngle,
    zAngle,
  }: { xAngle?: number; yAngle?: number; zAngle?: number } = {}) {
    isolateTransformations(() => {
      translate(this.position)

      if (xAngle !== undefined) rotateX(xAngle)
      if (yAngle !== undefined) rotateY(yAngle)
      if (zAngle !== undefined) rotateZ(zAngle)

      sphere(this.radius, { color: 'rgb(161, 12, 12)', lineWidth: 1 })
    })
  }
}

class CubeSphereMover extends Mover3D {
  constructor(
    mass: number,
    x: number,
    y: number,
    z: number,
    public radius: number,
  ) {
    super(mass, x, y, z)
  }

  distanceFromCenterToBorder() {
    return this.radius
  }

  render({
    xAngle,
    yAngle,
    zAngle,
  }: { xAngle?: number; yAngle?: number; zAngle?: number } = {}) {
    isolateTransformations(() => {
      translate(this.position)

      if (xAngle !== undefined) rotateX(xAngle)
      if (yAngle !== undefined) rotateY(yAngle)
      if (zAngle !== undefined) rotateZ(zAngle)

      sphere(this.radius, { color: 'rgb(161, 12, 12)', lineWidth: 1 })
      cube(this.radius * 2 * 0.7, {
        color: 'black',
        lineWidth: 2,
        opacity: 0.15,
      })
    })
  }
}

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
  FPS,
)

// Start the animation loop.
requestAnimationFrame(frame)
