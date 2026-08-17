import { abs, cos, sin } from '../math_utils.ts'
import { Vector3d } from '../vector_3d.ts'
import { Actor } from './actor.ts'
import {
  directionToAngle,
  renderCirclePixel,
  tileToPixel,
  toWorldPoint,
  triangle2d,
} from './render.ts'
import { DIRECTIONS, PACMAN_RADIUS_RATIO, TILE_SIZE } from './constants.ts'
import { millis } from '../utils.ts'

export class Pacman extends Actor {
  constructor(position: Vector3d, speedTilesPerSecond: number) {
    super(position, speedTilesPerSecond)
  }

  render(roundDelayRemainingMs = () => 0) {
    const position = this.positionInTiles()
    const pixel = tileToPixel(position.x + 0.5, position.y + 0.5)
    const radius = TILE_SIZE * PACMAN_RADIUS_RATIO
    const moving = this.dir !== 'none' && roundDelayRemainingMs() <= 0
    const facingDirection = this.dir !== 'none' ? this.dir : this.nextDir
    const chompPhase = abs(sin(millis() / 88))
    const mouth = moving ? 0.1 + 0.28 * chompPhase : 0.04
    const angle = directionToAngle(facingDirection)
    const look = DIRECTIONS[facingDirection]
    const bob = moving ? sin(millis() / 140) * radius * 0.05 : 0
    const centerX = pixel.x
    const centerY = pixel.y + bob

    renderCirclePixel(centerX, centerY + radius * 0.95, radius * 0.28, {
      color: 'rgba(0, 0, 0, 0.22)',
      noStroke: true,
    })
    renderCirclePixel(centerX, centerY, radius, {
      color: '#FFFF00',
      strokeColor: '#FFFF00',
      lineWidth: 1.4,
      noStroke: false,
    })

    const mouthA = {
      x: centerX + radius * 1.1 * cos(angle + mouth),
      y: centerY + radius * 1.1 * sin(angle + mouth),
    }
    const mouthB = {
      x: centerX + radius * 1.1 * cos(angle - mouth),
      y: centerY + radius * 1.1 * sin(angle - mouth),
    }

    triangle2d(
      toWorldPoint(centerX, centerY),
      toWorldPoint(mouthA.x, mouthA.y),
      toWorldPoint(mouthB.x, mouthB.y),
      { color: 'black', noStroke: true, isDoubleSided: true },
    )

    const eyeX = centerX + look.x * radius * 0.22 - look.y * radius * 0.24
    const eyeY = centerY + look.y * radius * 0.42 + look.x * radius * 0.44

    renderCirclePixel(eyeX, eyeY, radius * 0.12, { color: '#f9fcff' })
    renderCirclePixel(
      eyeX + look.x * radius * 0.03,
      eyeY + look.y * radius * 0.03,
      radius * 0.09,
      { color: '#16223a' },
    )
  }
}
