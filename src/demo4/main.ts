import {
  createFrameLoop,
  fps,
  millis,
  timesReduce,
  togglePause,
} from './../utils'
import {
  animation,
  background,
  processDeferredRenders,
  radians,
  render3dAxes,
  resetTransformationMatrix,
  rotateX,
  rotateY,
  text2d,
} from './../primitives'
import { $v } from './../vector'
import { PI } from './../math_utils'
import { FPS } from './../constants'
import { memoize } from '@cdandrea/memoize-ts'
import { LSystem } from './l_system'
import { Turtle } from './turtle'

const SQUARE_SIDES = 4

const moveAddedHalves = '½▽◻△◻②'
const smallerCubesMiddleLayer = '[◻→◻▽◼]→'.repeat(SQUARE_SIDES)
const smallerCubesTopBottomLayers = '[◻▽◼]→'.repeat(SQUARE_SIDES)
const largerCubesTopBottomLayers = (
  '[' +
  `${moveAddedHalves}→`.repeat(2) +
  '◼]→'
).repeat(SQUARE_SIDES)

const LSYSTEM_DATA = {
  axiom: '◼',
  rules: {
    // Alphabet:
    //
    // ←: turn left
    // →: turn right
    // ↑: go up
    // ↓: go down
    // ⟲ or ⟳: reverse direction (turn 180°)
    // ◼: draw a box and move
    // ◻: just move (without drawing a box)
    // ▽: decrease scale by current cube scale factor
    // △: increase scale by current cube scale factor
    // ½: decrease scale by a factor of 2
    // ②: increase scale by a factor of 2
    // [: save current transformation state (in stack)
    // ]: restore previous transformation state (from stack)
    // 👀: where am I? (displays tiny Cartesian XYZ axes, for debugging/positioning purposes only)
    //
    '◼': `
      [${smallerCubesMiddleLayer}]
      [↑◻↓ ${smallerCubesTopBottomLayers}]
      [↑ ${moveAddedHalves}↓ ${largerCubesTopBottomLayers}]
      [↓◻↑ ${smallerCubesTopBottomLayers}]
      [↓ ${moveAddedHalves}↑ ${largerCubesTopBottomLayers}]
      ◻◻▽◻△
    `,
    '◻': `◻◻▽◻△`,
  },
  angleInDegrees: 90,
  length: 300,
}

// -------------------------------------------------------------------------------------------------

const lsystem = new LSystem(LSYSTEM_DATA.axiom, LSYSTEM_DATA.rules)

const generations = 2
const smallerCubeSize = 100
const cubeScale = smallerCubeSize / LSYSTEM_DATA.length

const turtle = new Turtle(
  LSYSTEM_DATA.length / (2 + cubeScale) ** generations,
  radians(LSYSTEM_DATA.angleInDegrees),
  cubeScale,
)

const generateSentenceFn = memoize((generations: number) => {
  lsystem.reset()

  return timesReduce(generations, () => lsystem.generate(), lsystem.axiom)
})

// -------------------------------------------------------------------------------------------------

animation.onclick = () => togglePause()

const draw = () => {
  // console.log({ fps: fps(), millis: millis(), frameCount: frameCount() })
  console.log({ fps: fps() })

  background('lightGray')

  rotateX(-PI / 5)
  rotateY(millis() / 3000)

  render3dAxes()

  const sentence = generateSentenceFn(generations)

  turtle.render(sentence)
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
