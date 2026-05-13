import {
  cube,
  line,
  point,
  pop,
  push,
  rotateY,
  rotateZ,
  scale,
  translate,
} from '../primitives'
import { $v } from '../vector'

const TINY_AXIS_LENGTH = 50

export class Turtle {
  squareCount: number = 0

  constructor(
    public length: number,
    public angle: number,
    public cubeScale: number,
  ) {}

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

  private renderTiny3dAxes() {
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
}
