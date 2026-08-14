import { abs, cos, sin } from '../math_utils.ts'
import { Vector3d } from '../vector_3d.ts'
import { Actor, ActorEnvironment, DirectionName } from './actor.ts'

export type PacmanRenderContext = {
  tileToPixel: (x: number, y: number) => { x: number; y: number }
  // deno-lint-ignore no-explicit-any
  renderCirclePixel: (...args: any[]) => void
  toWorldPoint: (x: number, y: number) => Vector3d
  // deno-lint-ignore no-explicit-any
  triangle2d: (...args: any[]) => void
  directionToAngle: (direction: DirectionName) => number
  millis: () => number
  tileSize: number
  radiusRatio: number
  roundDelayRemainingMs: () => number
}

export class Pacman extends Actor {
  constructor(
    position: Vector3d,
    speedTilesPerSecond: number,
    environment: ActorEnvironment,
    private renderContext: PacmanRenderContext,
  ) {
    super(position, speedTilesPerSecond, environment)
  }

  render() {
    const {
      tileToPixel,
      renderCirclePixel,
      toWorldPoint,
      triangle2d,
      directionToAngle,
      millis,
      tileSize,
      radiusRatio,
      roundDelayRemainingMs,
    } = this.renderContext
    const position = this.positionInTiles()
    const pixel = tileToPixel(position.x + 0.5, position.y + 0.5)
    const radius = tileSize * radiusRatio
    const moving = this.dir !== 'none' && roundDelayRemainingMs() <= 0
    const facingDirection = this.dir !== 'none' ? this.dir : this.nextDir
    const chompPhase = abs(sin(millis() / 88))
    const mouth = moving ? 0.1 + 0.28 * chompPhase : 0.04
    const angle = directionToAngle(facingDirection)
    const look = this.environment.directions[facingDirection]
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
