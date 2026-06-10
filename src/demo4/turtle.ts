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
