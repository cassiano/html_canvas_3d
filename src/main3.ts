import { createFrameLoop, fps, millis, timesReduce, togglePause } from './utils'
import {
  animation,
  background,
  box,
  line,
  point,
  pop,
  processDeferredRenders,
  push,
  radians,
  render3dAxes,
  resetTransformationMatrix,
  rotateX,
  rotateY,
  rotateZ,
  scale,
  text2d,
  translate,
} from './primitives'
import { $v } from './vector'
import { PI } from './math_utils'
import { FPS } from './constants'
import { memoize } from '@cdandrea/memoize-ts'

type SingleChar = string

// -------------------------------------------------------------------------------------------------

// The Nature of Code
// Daniel Shiffman
// http://natureofcode.com

// An LSystem has a starting sentence
// An a ruleset
// Each generation recursively replaces characters in the sentence
// Based on the ruleset

// Construct an LSystem with a starting sentence and a ruleset
class LSystem {
  sentence: string = ''

  constructor(
    public axiom: string,
    public ruleset: Record<SingleChar, string>,
  ) {
    this.reset()

    Object.keys(this.ruleset).forEach(key => {
      this.ruleset[key] = this.ruleset[key].replace(/\s/g, '')
    })
  }

  reset() {
    this.sentence = this.axiom
  }

  // Generate the next generation
  generate() {
    // An empty string that we will fill
    let nextgen = ''

    // For every character in the sentence
    for (const character of this.sentence) {
      // Replace it with itself unless it matches one of our rules
      nextgen += this.ruleset[character] ?? character
    }

    // Replace sentence
    return (this.sentence = nextgen)
  }
}

// -------------------------------------------------------------------------------------------------

const TINY_AXIS_LENGTH = 50

const renderTiny3dAxes = () => {
  const xNeg = $v(-TINY_AXIS_LENGTH / 2, 0, 0)
  const xPos = $v(TINY_AXIS_LENGTH / 2, 0, 0)

  const yNeg = $v(0, -TINY_AXIS_LENGTH / 2, 0)
  const yPos = $v(0, TINY_AXIS_LENGTH / 2, 0)

  const zNeg = $v(0, 0, -TINY_AXIS_LENGTH / 2)
  const zPos = $v(0, 0, TINY_AXIS_LENGTH / 2)

  // X-axis
  line(xNeg, xPos, { color: 'darkRed' })
  point(xPos, { color: 'red', size: 5 })

  // Y-axis
  line(yNeg, yPos, { color: 'darkGreen' })
  point(yPos, { color: 'green', size: 5 })

  // Z-axis
  line(zNeg, zPos, { color: 'darkBlue' })
  point(zPos, { color: 'blue', size: 5 })
}

// -------------------------------------------------------------------------------------------------

class Turtle {
  squareCount: number = 0

  constructor(
    public length: number,
    public angle: number,
    public cubeScale: number,
  ) {
    this.resetSquareCount()
  }

  resetSquareCount() {
    this.squareCount = 0
  }

  render(sentence: string) {
    this.resetSquareCount()

    for (const character of sentence) {
      switch (character) {
        case '◼':
          box(this.length, this.length, this.length)
          this.squareCount++
          translate(this.length, 0, 0)
          break
        case '◻':
          translate(this.length, 0, 0)
          break
        case '↓':
        case 'D':
          rotateY(this.angle)
          break
        case '↑':
        case 'U':
          rotateY(-this.angle)
          break
        case '←':
        case '<':
        case '-':
        case 'L':
          rotateZ(-this.angle)
          break
        case '→':
        case '>':
        case '+':
        case 'R':
          rotateZ(this.angle)
          break
        case '⟲':
          rotateZ(-this.angle * 2)
          break
        case '⟳':
          rotateZ(this.angle * 2)
          break
        case '[':
        case '(':
        case '{':
          push()
          break
        case ']':
        case ')':
        case '}':
          pop()
          break
        case '½':
          scale(1 / 2, 1 / 2, 1 / 2)
          break
        case '②':
        case '⑵':
        case '2':
          scale(2, 2, 2)
          break
        case '▽':
          scale(this.cubeScale, this.cubeScale, this.cubeScale)
          break
        case '△':
          scale(1 / this.cubeScale, 1 / this.cubeScale, 1 / this.cubeScale)
          break
        case '👀':
          renderTiny3dAxes()
          break
        default:
          throw new Error(`Unrecognized character ${character}`)
      }
    }
  }
}

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
  rotateY(PI / 9 + millis() / 3000)

  render3dAxes()

  const sentence = generateSentenceFn(generations)

  turtle.render(sentence)
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
