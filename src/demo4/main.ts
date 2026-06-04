/////////////////////////
// Jerusalem Cube Demo //
/////////////////////////

import { createFrameLoop, fps, millis, timesReduce } from './../utils.ts'
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
import { max, PI } from './../math_utils.ts'
import { FPS } from './../constants.ts'
import { LSystem } from './l_system.ts'
import { Turtle } from './turtle.ts'
import { frameCount, createDemoControlPanel, createSlider } from '../utils.ts'
import { FPS_LOGGING_FRAME_FREQUENCY } from '../constants.ts'
import { radians } from '../math_utils.ts'

// -------------------------------------------------------------------------------------------------

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
  length: 330,
}

let turtle: Turtle
let sentence: string

const lsystem = new LSystem(LSYSTEM_DATA.axiom, LSYSTEM_DATA.rules)

// -------------------------------------------------------------------------------------------------

// Get the canvas container
const canvasContainer = document.getElementById('canvas-container')
if (!canvasContainer) throw new Error('canvasContainer not found')

let demoControlPanel: HTMLDivElement | null

const createDemoControls = () => {
  demoControlPanel = createDemoControlPanel(canvasContainer)

  const sliders = {
    smallerCubeScale: createSlider({
      label: 'Smaller cube %',
      min: 0,
      max: 100,
      value: 50,
      valueFormatter: v => `${v.toFixed(1)}%`,
      container: demoControlPanel,
    }),
    generations: createSlider({
      label: 'Generations',
      min: 0,
      max: 3,
      value: 2,
      length: 80,
      color: 'blue',
      container: demoControlPanel,
    }),
  }

  const createTurtle = () => {
    const generations = sliders.generations.getValue()
    const smallerCubeScale = max(
      sliders.smallerCubeScale.getValue() / 100,
      Number.EPSILON, // `smallerCubeScale` cannot be zero.
    )

    turtle = new Turtle(
      LSYSTEM_DATA.length / (2 + smallerCubeScale) ** generations,
      radians(LSYSTEM_DATA.angleInDegrees),
      smallerCubeScale,
    )
  }

  const generateSentence = () => {
    const generations = sliders.generations.getValue()

    lsystem.reset()

    sentence = timesReduce(generations, () => lsystem.generate(), lsystem.axiom)
  }

  sliders.smallerCubeScale.getInput().addEventListener('input', createTurtle)

  sliders.generations.getInput().addEventListener('input', () => {
    generateSentence()
    createTurtle()
  })

  generateSentence()
  createTurtle()
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

  turtle?.render(sentence)
}

const onPaused = () => {
  text2d('PAUSED', $v(0, 300))
}

const { start: startFrameLoop, stop: stopFrameLoop } = createFrameLoop(
  () => {
    resetTransformationMatrix()
    draw()
    render3dScene()
  },
  onPaused,
  FPS,
)

const start = () => {
  createDemoControls()
  startFrameLoop()
}

const stop = () => {
  demoControlPanel?.remove()
  demoControlPanel = null

  stopFrameLoop()
}

export { start, stop }
