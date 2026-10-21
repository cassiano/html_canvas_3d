import {
  cone,
  cube,
  line,
  pop,
  push,
  rotateY,
  rotateZ,
  scale,
  translate,
} from '../primitives.ts'
import { $v } from '../vector_3d.ts'
import { isolateTransformations, rotateX } from '../primitives.ts'
import { HALF_PI } from '../math_utils.ts'

/**
 * The length of the tiny coordinate axes drawn by the turtle's debugging
 * command.
 */
const TINY_AXIS_LENGTH = 50

/**
 * A turtle that interprets a sentence of commands, drawing cubes and
 * moving around the scene as it goes.
 *
 * Each character of the sentence is a command: some of them draw a cube and
 * move forward, some of them only turn or move, some of them change the
 * current scale, and some of them save or restore the current
 * transformation state.
 */
export class Turtle {
  /**
   * The number of cubes drawn by the turtle.
   *
   * The counter is exposed for inspection; the turtle does not update it by
   * itself.
   */
  squareCount: number = 0

  /**
   * Creates a turtle with the given movement and turning parameters.
   *
   * @param length - The distance the turtle moves on every forward command,
   *   in world units. It is also the side of the cubes it draws.
   * @param angle - The angle the turtle turns by on every turning command,
   *   in radians.
   * @param cubeScale - The factor applied to the current scale by the
   *   commands that add or remove half a step.
   */
  constructor(
    public length: number,
    public angle: number,
    public cubeScale: number,
  ) {}

  /**
   * Renders a sentence of turtle commands, drawing to the canvas and
   * changing the current transformation state as the commands are read.
   *
   * The supported commands are:
   *
   * - `◼`: draw a cube and move forward.
   * - `◻`: move forward without drawing.
   * - `↑`/`U`: turn upwards; `↓`/`D`: turn downwards.
   * - `←`/`<`/`-`/`L`: turn left; `→`/`>`/`+`/`R`: turn right.
   * - `⟲`/`⟳`: reverse the current direction.
   * - `[`/`(`/`{`: save the current transformation state.
   * - `]`/`)`/`}`: restore the last saved transformation state.
   * - `½`: halve the current scale; `②`/`⑵`/`2`: double it.
   * - `▽`/`△`: decrease or increase the current scale by the turtle's
   *   scale factor.
   * - `👀`: draw a tiny coordinate system at the current position.
   *
   * @param sentence - The sequence of commands to execute.
   * @returns Nothing; the function draws to the canvas and leaves the
   *   current transformation state modified.
   * @throws {Error} When the sentence contains a character that is not a
   *   recognized turtle command.
   * @throws {Error} When the sentence restores the transformation state more
   *   times than it saves it, leaving the transformation stack empty.
   */
  render(sentence: string) {
    for (const character of sentence) {
      switch (character) {
        case '◼':
          cube(this.length, { color: '#AAA' })
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
          scale(1 / 2)
          break
        case '②':
        case '⑵':
        case '2':
          scale(2)
          break
        case '▽':
          scale(this.cubeScale)
          break
        case '△':
          scale(1 / this.cubeScale)
          break
        case '👀':
          this.renderTiny3dAxes()
          break
        default:
          throw new Error(`Unrecognized character ${character}`)
      }
    }
  }

  /**
   * Draws a tiny coordinate system at the turtle's current position, to help
   * debugging and positioning.
   *
   * @returns Nothing; the function draws to the canvas.
   */
  private renderTiny3dAxes() {
    const xNeg = $v(-TINY_AXIS_LENGTH / 2, 0, 0)
    const xPos = $v(TINY_AXIS_LENGTH / 2, 0, 0)

    const yNeg = $v(0, -TINY_AXIS_LENGTH / 2, 0)
    const yPos = $v(0, TINY_AXIS_LENGTH / 2, 0)

    const zNeg = $v(0, 0, -TINY_AXIS_LENGTH / 2)
    const zPos = $v(0, 0, TINY_AXIS_LENGTH / 2)

    // X-axis
    isolateTransformations(() => {
      line(xNeg, xPos, { color: 'red' })
      translate(xPos)
      rotateY(HALF_PI)
      cone(2, 7, { color: 'red', size: 5, circleSegments: 10 })
    })

    // Y-axis
    isolateTransformations(() => {
      line(yNeg, yPos, { color: 'green' })
      translate(yPos)
      rotateX(-HALF_PI)
      cone(2, 7, { color: 'green', size: 5, circleSegments: 10 })
    })

    // Z-axis
    isolateTransformations(() => {
      line(zNeg, zPos, { color: 'blue' })
      translate(zPos)
      cone(2, 7, { color: 'blue', size: 5, circleSegments: 10 })
    })
  }
}
