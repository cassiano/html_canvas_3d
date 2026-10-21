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
import { FPS_LOGGING_FRAME_PERIOD } from '../constants.ts'
import { radians } from '../math_utils.ts'
import { autoRotationEnabled, scale } from '../primitives.ts'

// -------------------------------------------------------------------------------------------------

/**
 * The number of sides of the square the L-system builds.
 */
const SQUARE_SIDES = 4

/**
 * The sequence of commands that adds or removes half a step to the current
 * scale.
 */
const moveAddedHalves = '½▽◻△◻②'
/**
 * The sequence of commands that builds the middle layer of the smaller cubes.
 */
const smallerCubesMiddleLayer = '[◻→◻▽◼]→'.repeat(SQUARE_SIDES)
/**
 * The sequence of commands that builds the top and bottom layers of the
 * smaller cubes.
 */
const smallerCubesTopBottomLayers = '[◻▽◼]→'.repeat(SQUARE_SIDES)
/**
 * The sequence of commands that builds the top and bottom layers of the
 * larger cubes.
 */
const largerCubesTopBottomLayers = (
  '[' +
  `${moveAddedHalves}→`.repeat(2) +
  '◼]→'
).repeat(SQUARE_SIDES)

/**
 * The description of the L-system rendered by the demo: its starting
 * sentence, its replacement rules, the turning angle and the length of the
 * turtle's steps.
 */
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

/**
 * The turtle that interprets the L-system's sentence, created once the demo's
 * controls are set up.
 */
let turtle: Turtle
/**
 * The sentence currently rendered by the turtle.
 */
let sentence: string

/**
 * The L-system that produces the sentences rendered by the demo.
 */
const lsystem = new LSystem(LSYSTEM_DATA.axiom, LSYSTEM_DATA.rules)

// -------------------------------------------------------------------------------------------------

// Get the canvas container
// Notice: loading this module throws when the canvas container is missing
// from the page.
const canvasContainer = document.getElementById('canvas-container')
if (!canvasContainer) throw new Error('canvasContainer not found')

/**
 * The demo's control panel, while it is attached to the canvas container.
 */
let demoControlPanel: HTMLDivElement | null

/**
 * The type of the demo's form, holding the sliders that drive the L-system.
 */
type DemoFormType = {
  sliders?: Record<
    'smallerCubeScale' | 'generations',
    ReturnType<typeof createSlider>
  >
}

/**
 * The demo's controls, exposed so that they can be inspected or driven
 * programmatically.
 */
export const demoForm: DemoFormType = {}

/**
 * Creates the demo's control panel and the turtle that renders the
 * L-system.
 *
 * The panel hosts two sliders: one choosing how many generations of the
 * L-system are generated, and one choosing how much smaller the resulting
 * cubes are. Changing either of them regenerates the sentence and rebuilds
 * the turtle.
 *
 * @returns Nothing; the function appends the control panel to the canvas
 *   container and updates the demo's form in place.
 */
const createDemoControls = () => {
  demoControlPanel = createDemoControlPanel(canvasContainer)

  demoForm.sliders = {
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

  /**
   * Creates a turtle matching the current slider values.
   *
   * The turtle's step length shrinks as the requested number of generations
   * grows, so that the resulting structure keeps a constant overall size.
   *
   * @returns Nothing; the function replaces the demo's turtle in place.
   */
  const createTurtle = () => {
    if (!demoForm.sliders) return

    const generations = demoForm.sliders.generations.getValue()
    const smallerCubeScale = max(
      demoForm.sliders.smallerCubeScale.getValue() / 100,
      Number.EPSILON, // `smallerCubeScale` cannot be zero.
    )

    turtle = new Turtle(
      LSYSTEM_DATA.length / (2 + smallerCubeScale) ** generations,
      radians(LSYSTEM_DATA.angleInDegrees),
      smallerCubeScale,
    )
  }

  /**
   * Generates the sentence rendered by the turtle, according to the requested
   * number of generations.
   *
   * The L-system is rewound to its axiom before the generations are
   * produced, so the same slider values always yield the same sentence.
   *
   * @returns Nothing; the function replaces the demo's sentence in place.
   */
  const generateSentence = () => {
    if (!demoForm.sliders) return

    const generations = demoForm.sliders.generations.getValue()

    lsystem.reset()

    sentence = timesReduce(generations, () => lsystem.generate(), lsystem.axiom)
  }

  demoForm.sliders.smallerCubeScale
    .getInput()
    .addEventListener('input', createTurtle)

  demoForm.sliders.generations.getInput().addEventListener('input', () => {
    generateSentence()
    createTurtle()
  })

  generateSentence()
  createTurtle()
}

// -------------------------------------------------------------------------------------------------

/**
 * Renders a single frame of the demo.
 *
 * The scene shows the structure described by the L-system's sentence, seen
 * from an automatically rotating coordinate system.
 *
 * @returns Nothing; the function draws to the canvas.
 * @throws {Error} When the L-system's sentence contains a character that is
 *   not a recognized turtle command.
 * @throws {Error} When the L-system's sentence restores the transformation
 *   state more times than it saves it.
 */
const draw = () => {
  if (frameCount() % FPS_LOGGING_FRAME_PERIOD === 0) console.log({ fps: fps() })

  background('lightGray')

  scale(1.3)
  rotateX(PI / 4)

  if (autoRotationEnabled) rotateY(-millis() / 2000)
  else rotateY(PI / 6)

  render3dAxes()

  turtle?.render(sentence)
}

/**
 * Displays the pause indicator once the frame loop enters the paused state.
 *
 * @returns Nothing; the function draws the indicator on the canvas.
 */
const onPaused = () => {
  text2d('PAUSED', $v(0, 300))
}

/**
 * The demo's animation frame loop.
 *
 * Every frame resets the transformation matrix, draws the scene and flushes
 * the deferred render queue.
 */
const { start: startFrameLoop, stop: stopFrameLoop } = createFrameLoop(
  () => {
    resetTransformationMatrix()
    draw()
    render3dScene()
  },
  onPaused,
  FPS,
)

/**
 * Starts the demo.
 *
 * The demo's control panel is created and appended to the canvas container,
 * and the animation frame loop begins rendering the scene.
 *
 * @returns Nothing; the function starts the animation frame loop.
 */
const start = () => {
  createDemoControls()
  startFrameLoop()
}

/**
 * Stops the demo.
 *
 * The demo's control panel is removed from the DOM and the animation frame
 * loop ends, so no further frames are drawn.
 *
 * @returns Nothing; the function stops the animation frame loop.
 */
const stop = () => {
  demoControlPanel?.remove()
  demoControlPanel = null

  stopFrameLoop()
}

/**
 * The demo's lifecycle API, consumed by the demo loader.
 */
export { start, stop }
