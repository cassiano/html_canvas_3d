import { ORIGIN } from '../constants.ts'
import { floor } from '../math_utils.ts'
import { millis, assertIsNotUndefined } from '../utils.ts'
import { $v, Vector3d } from '../vector_3d.ts'
import { Actor } from './actor.ts'
import {
  CLYDE_SHY_DISTANCE_TILES,
  PINKY_LOOKAHEAD_TILES,
  INKY_LOOKAHEAD_TILES,
} from './constants.ts'
import {
  BLINKY_NAME,
  PINKY_NAME,
  INKY_NAME,
  CLYDE_NAME,
  ROW_COUNT,
  DirectionName,
  DIRECTIONS,
  GHOST_RADIUS_RATIO,
  GhostMarker,
  GhostName,
  POWER_WARNING_FLASH_INTERVAL_MS,
  POWER_WARNING_FLASH_MS,
  TILE_SIZE,
  NONE,
  LEFT,
} from './constants.ts'
import {
  renderCirclePixel,
  renderFilledRectPixel,
  tileToPixel,
} from './render_utils.ts'

export class Ghost extends Actor {
  lastEatenPowerModeId = -1
  isEaten = false

  constructor(
    position: Vector3d,
    speedTilesPerSecond: number,
    initialDirection: DirectionName,
    public readonly id: number,
    public readonly name: GhostName,
    public readonly marker: GhostMarker,
    public readonly color: string,
  ) {
    super(position, speedTilesPerSecond, initialDirection)
  }

  markEaten(baseSpeed: number, speedMultiplier = 1.6) {
    this.progress = 0
    this.dir = NONE
    this.nextDir = NONE
    this.speedTilesPerSecond = baseSpeed * speedMultiplier
    this.isEaten = true
  }

  revive(direction: DirectionName = LEFT, speed: number) {
    this.isEaten = false
    this.speedTilesPerSecond = speed
    this.dir = direction
    this.nextDir = direction
  }

  tryReviveAt(target: Vector3d, direction: DirectionName, speed: number) {
    if (!this.position.equals(target)) return false

    this.revive(direction, speed)

    return true
  }

  nextDirectionToTarget(target: Vector3d): DirectionName {
    // Breadth-first search finds the shortest walkable route to the target.
    // The predecessor map is used to recover only the first move on that route.
    const queue: Vector3d[] = [this.position.clone()]
    const visited = new Set<string>([`${this.position.y},${this.position.x}`])
    const previous = new Map<
      string,
      { position: Vector3d; dir: DirectionName }
    >()

    while (queue.length > 0) {
      const current = queue.shift()!

      if (current.equals(target)) break
      ;(Object.keys(DIRECTIONS) as DirectionName[]).forEach(dir => {
        if (dir === NONE) return

        const next = Actor.nextCell(current, dir)
        const key = `${next.y},${next.x}`

        if (visited.has(key) || Actor.isWall(next)) return

        visited.add(key)
        previous.set(key, { position: current.clone(), dir })
        queue.push(next)
      })
    }

    const targetKey = `${target.y},${target.x}`
    if (!previous.has(targetKey)) return NONE

    let stepKey = targetKey

    while (true) {
      const step = previous.get(stepKey)

      if (!step) return NONE
      if (step.position.equals(this.position)) return step.dir

      stepKey = `${step.position.y},${step.position.x}`
    }
  }

  getChaseTarget(
    pacmanPos: Vector3d,
    pacmanFacing: Vector3d,
    ghosts: Ghost[],
  ): Vector3d {
    const clonedPacmanPos = pacmanPos.clone()

    // Each ghost transforms Pacman's state differently, creating distinct
    // chase personalities instead of four identical pursuers.
    switch (this.name) {
      case BLINKY_NAME:
        return clonedPacmanPos

      case PINKY_NAME:
        return clonedPacmanPos.add(
          pacmanFacing.clone().mult(PINKY_LOOKAHEAD_TILES),
        )

      case INKY_NAME: {
        const pivot = clonedPacmanPos.add(
          pacmanFacing.clone().mult(INKY_LOOKAHEAD_TILES),
        )
        const blinky = ghosts.find(ghost => ghost.name === BLINKY_NAME)
        assertIsNotUndefined(blinky)

        const blinkyPos = blinky.positionInTiles()

        return pivot.mult(2).sub(blinkyPos)
      }

      case CLYDE_NAME: {
        const deltaToPacman = clonedPacmanPos.sub(this.position)

        if (deltaToPacman.manhattanDist(ORIGIN) <= CLYDE_SHY_DISTANCE_TILES)
          return $v(1, ROW_COUNT - 2) // Scatter target.

        return clonedPacmanPos
      }

      default: {
        const exhaustiveCheck: never = this.name
        return exhaustiveCheck
      }
    }
  }

  render(getPowerModeRemainingMs = () => 0, getCurrentPowerModeId = () => -1) {
    const position = this.positionInTiles()
    const pixel = tileToPixel(position.x + 0.5, position.y + 0.5)
    const radius = TILE_SIZE * GHOST_RADIUS_RATIO
    const left = pixel.x - radius
    const top = pixel.y - radius
    const right = pixel.x + radius
    const bottom = pixel.y + radius
    const eyeOffsetX = radius * 0.35
    const eyeOffsetY = radius * 0.2
    const eyeRadius = radius * 0.33
    const pupilRadius = radius * 0.15
    const lookDirection = DIRECTIONS[this.dir]
    const frightened =
      getPowerModeRemainingMs() > 0 &&
      this.lastEatenPowerModeId !== getCurrentPowerModeId()
    const shouldFlashWarning =
      frightened &&
      getPowerModeRemainingMs() <= POWER_WARNING_FLASH_MS &&
      floor(millis() / POWER_WARNING_FLASH_INTERVAL_MS) % 2 === 0
    const bodyColor = frightened
      ? shouldFlashWarning
        ? '#f5f5f5'
        : '#2f6eff'
      : this.color

    if (this.isEaten) {
      renderCirclePixel(pixel.x - eyeOffsetX, pixel.y - eyeOffsetY, eyeRadius, {
        color: 'white',
      })
      renderCirclePixel(pixel.x + eyeOffsetX, pixel.y - eyeOffsetY, eyeRadius, {
        color: 'white',
      })
      renderCirclePixel(
        pixel.x - eyeOffsetX + lookDirection.x * eyeRadius * 0.45,
        pixel.y - eyeOffsetY + lookDirection.y * eyeRadius * 0.45,
        pupilRadius,
        { color: '#111' },
      )
      renderCirclePixel(
        pixel.x + eyeOffsetX + lookDirection.x * eyeRadius * 0.45,
        pixel.y - eyeOffsetY + lookDirection.y * eyeRadius * 0.45,
        pupilRadius,
        { color: '#111' },
      )
      return
    }

    renderCirclePixel(pixel.x, top + radius, radius, {
      color: bodyColor,
      noStroke: true,
    })
    renderFilledRectPixel(left, pixel.y, radius * 2, radius, bodyColor)
    renderCirclePixel(left + radius * 0.35, bottom, radius * 0.22, {
      color: bodyColor,
    })
    renderCirclePixel(pixel.x, bottom, radius * 0.22, { color: bodyColor })
    renderCirclePixel(right - radius * 0.35, bottom, radius * 0.22, {
      color: bodyColor,
    })
    renderCirclePixel(pixel.x - eyeOffsetX, pixel.y - eyeOffsetY, eyeRadius, {
      color: 'white',
    })
    renderCirclePixel(pixel.x + eyeOffsetX, pixel.y - eyeOffsetY, eyeRadius, {
      color: 'white',
    })
    renderCirclePixel(
      pixel.x - eyeOffsetX + lookDirection.x * eyeRadius * 0.45,
      pixel.y - eyeOffsetY + lookDirection.y * eyeRadius * 0.45,
      pupilRadius,
      { color: '#111' },
    )
    renderCirclePixel(
      pixel.x + eyeOffsetX + lookDirection.x * eyeRadius * 0.45,
      pixel.y - eyeOffsetY + lookDirection.y * eyeRadius * 0.45,
      pupilRadius,
      { color: '#111' },
    )
  }
}
