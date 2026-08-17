import { abs, floor } from '../math_utils.ts'
import { $v, Vector3d } from '../vector_3d.ts'
import { Actor, ActorEnvironment, DirectionName, nextCell } from './actor.ts'
import { GhostName, GhostMarker } from './constants.ts'

export type GhostRenderContext = {
  tileToPixel: (x: number, y: number) => { x: number; y: number }
  // deno-lint-ignore no-explicit-any
  renderCirclePixel: (...args: any[]) => void
  // deno-lint-ignore no-explicit-any
  renderFilledRectPixel: (...args: any[]) => void
  millis: () => number
  floor: typeof floor
  abs: typeof abs
  tileSize: number
  radiusRatio: number
  powerWarningFlashMs: number
  powerWarningFlashIntervalMs: number
  getPowerModeRemainingMs: () => number
  getCurrentPowerModeId: () => number
  getGhostHouseCenterTarget: () => Vector3d
  getGhosts: () => Ghost[]
}

export class Ghost extends Actor {
  lastEatenPowerModeId = -1
  isEaten = false

  constructor(
    position: Vector3d,
    speedTilesPerSecond: number,
    initialDirection: DirectionName,
    public id: number,
    public name: GhostName,
    public marker: GhostMarker,
    public color: string,
    environment: ActorEnvironment,
    private renderContext: GhostRenderContext,
  ) {
    super(position, speedTilesPerSecond, environment, initialDirection)
  }

  markEaten(baseSpeed: number, speedMultiplier = 1.6) {
    this.progress = 0
    this.dir = 'none'
    this.nextDir = 'none'
    this.speedTilesPerSecond = baseSpeed * speedMultiplier
    this.isEaten = true
  }

  revive(direction: DirectionName = 'left', speed: number) {
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
    const queue: Vector3d[] = [this.position.clone()]
    const visited = new Set<string>([`${this.position.y},${this.position.x}`])
    const previous = new Map<
      string,
      { position: Vector3d; dir: DirectionName }
    >()

    while (queue.length > 0) {
      const current = queue.shift()!

      if (current.equals(target)) break
      ;(Object.keys(this.environment.directions) as DirectionName[]).forEach(
        dir => {
          if (dir === 'none') return

          const next = nextCell(current, dir, this.environment)
          const key = `${next.y},${next.x}`

          if (visited.has(key) || this.environment.isWall(next)) return

          visited.add(key)
          previous.set(key, { position: current.clone(), dir })
          queue.push(next)
        },
      )
    }

    const targetKey = `${target.y},${target.x}`
    if (!previous.has(targetKey)) return 'none'

    let stepKey = targetKey

    while (true) {
      const step = previous.get(stepKey)

      if (!step) return 'none'
      if (step.position.equals(this.position)) return step.dir

      stepKey = `${step.position.y},${step.position.x}`
    }
  }

  getChaseTarget(
    pacmanPos: Vector3d,
    pacmanFacing: Vector3d,
    ghosts: Ghost[],
    pinkyLookaheadTiles: number,
    inkyLookaheadTiles: number,
    clydeShyDistanceTiles: number,
    getClydeScatterTarget: () => Vector3d,
  ): Vector3d {
    switch (this.name) {
      case 'Blinky':
        return $v(pacmanPos.x, pacmanPos.y)
      case 'Pinky':
        return pacmanPos
          .clone()
          .add(pacmanFacing.clone().mult(pinkyLookaheadTiles))
      case 'Inky': {
        const pivot = pacmanPos
          .clone()
          .add(pacmanFacing.clone().mult(inkyLookaheadTiles))
        const blinky = ghosts.find(ghost => ghost.name === 'Blinky')
        if (!blinky) return pivot
        const blinkyPos = blinky.positionInTiles()
        return $v(
          pivot.x + (pivot.x - blinkyPos.x),
          pivot.y + (pivot.y - blinkyPos.y),
        )
      }
      case 'Clyde': {
        const deltaToPacman = pacmanPos.clone().sub(this.position)
        const manhattanDistance = abs(deltaToPacman.y) + abs(deltaToPacman.x)
        if (manhattanDistance <= clydeShyDistanceTiles)
          return getClydeScatterTarget()
        return $v(pacmanPos.x, pacmanPos.y)
      }
    }
  }

  render() {
    const {
      tileToPixel,
      renderCirclePixel,
      renderFilledRectPixel,
      millis,
      floor,
      tileSize,
      radiusRatio,
      powerWarningFlashMs,
      powerWarningFlashIntervalMs,
      getPowerModeRemainingMs,
      getCurrentPowerModeId,
    } = this.renderContext
    const position = this.positionInTiles()
    const pixel = tileToPixel(position.x + 0.5, position.y + 0.5)
    const radius = tileSize * radiusRatio
    const left = pixel.x - radius
    const top = pixel.y - radius
    const right = pixel.x + radius
    const bottom = pixel.y + radius
    const eyeOffsetX = radius * 0.35
    const eyeOffsetY = radius * 0.2
    const eyeRadius = radius * 0.33
    const pupilRadius = radius * 0.15
    const lookDirection = this.environment.directions[this.dir]
    const frightened =
      getPowerModeRemainingMs() > 0 &&
      this.lastEatenPowerModeId !== getCurrentPowerModeId()
    const shouldFlashWarning =
      frightened &&
      getPowerModeRemainingMs() <= powerWarningFlashMs &&
      floor(millis() / powerWarningFlashIntervalMs) % 2 === 0
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
