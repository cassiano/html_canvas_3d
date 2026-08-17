import { FPS, FPS_LOGGING_FRAME_PERIOD } from '../constants.ts'
import {
  createFrameLoop,
  millis,
  frameCount,
  fps,
  timesForEachN,
} from '../utils.ts'
import {
  animation,
  background,
  resetTransformationMatrix,
} from '../primitives.ts'
import { abs, floor, max, min, random } from '../math_utils.ts'
import { $v, Vector3d } from '../vector_3d.ts'
import { text2d, render3dScene } from '../primitives.ts'
import {
  playCherryPickup,
  playDeath,
  playGhostEaten,
  playWaka,
  resumeAudio,
  startPowerSirenLoop,
  stopPowerSirenLoop,
} from './audio.ts'
import { ActorEnvironment, canMove, DirectionName, nextCell } from './actor.ts'
import { Ghost } from './ghost.ts'
import { Pacman } from './pacman.ts'
import {
  directionToAngle,
  renderCherry,
  renderCirclePixel,
  renderFilledRectPixel,
  renderPellet,
  renderPowerPellet,
  renderWall,
  tileToPixel,
  toWorldPoint,
  triangle2d,
} from './render.ts'
import {
  BASE_GHOST_SPEED,
  BASE_PACMAN_SPEED,
  BLINKY_MARKER,
  BLINKY_NAME,
  CHERRY_EXTRA_SCORE,
  CHERRY_MARKER,
  CHERRY_RESPAWN_DECREASE_PER_PHASE,
  CHERRY_RESPAWN_MAX_MS,
  CHERRY_RESPAWN_MIN_MS,
  CHERRY_SCORE,
  CHERRY_VISIBLE_MS,
  CLYDE_MARKER,
  CLYDE_NAME,
  CLYDE_SHY_DISTANCE_TILES,
  COLLISION_DISTANCE_TILES,
  COLUMN_COUNT,
  DIRECTIONS,
  EMPTY_MARKER,
  GHOST_EATEN_BASE_SCORE,
  GHOST_MARKER_SPECS,
  GHOST_RADIUS_RATIO,
  GHOST_SPEED_INCREASE_PER_PHASE,
  HIGH_SCORE_STORAGE_KEY,
  INKY_LOOKAHEAD_TILES,
  INKY_MARKER,
  INKY_NAME,
  MAZE_TEMPLATE,
  MIN_CHERRY_RESPAWN_MAX_MS,
  MIN_CHERRY_RESPAWN_MIN_MS,
  MIN_POWER_MODE_MS,
  OPPOSITE_DIRECTIONS,
  PACMAN_MARKER,
  PACMAN_RADIUS_RATIO,
  PINKY_LOOKAHEAD_TILES,
  PINKY_MARKER,
  PINKY_NAME,
  PELLET_MARKER,
  POWER_MODE_GHOST_SPEED_FACTOR,
  POWER_MODE_MS,
  POWER_MODE_MS_DECREASE_PER_PHASE,
  POWER_PELLET_MARKER,
  POWER_WARNING_FLASH_INTERVAL_MS,
  POWER_WARNING_FLASH_MS,
  ROUND_START_DELAY_MS,
  ROW_COUNT,
  TILE_SIZE,
  WALL_MARKER,
} from './constants.ts'

type GameState = 'playing' | 'won' | 'gameOver'

type GhostMarker =
  | typeof CLYDE_MARKER
  | typeof INKY_MARKER
  | typeof PINKY_MARKER
  | typeof BLINKY_MARKER
type GhostName =
  | typeof BLINKY_NAME
  | typeof PINKY_NAME
  | typeof INKY_NAME
  | typeof CLYDE_NAME

// [/doc_img/main.ts/2026-08-08-12-04-06.png]
type Tile =
  | typeof WALL_MARKER
  | typeof EMPTY_MARKER
  | typeof PELLET_MARKER
  | typeof POWER_PELLET_MARKER
  | typeof CHERRY_MARKER
  | typeof PACMAN_MARKER
  | GhostMarker

type GhostStart = {
  position: Vector3d
  marker: GhostMarker
  name: GhostName
  color: string
}

function getClydeScatterTarget(): Vector3d {
  return $v(1, ROW_COUNT - 2)
}

class Game {
  private readonly maze: Tile[][] = MAZE_TEMPLATE.map(line => {
    return [...line] as Tile[]
  })

  private readonly pacmanStart: Vector3d
  private readonly ghostStarts: GhostStart[]
  private readonly cherrySpawnPosition: Vector3d
  private readonly actorEnvironment: ActorEnvironment
  private readonly pacman: Pacman
  private readonly ghosts: Ghost[]

  private lastTickMillis: number | null = null
  private score = 0
  private highScore = 0
  private lives = 3
  private gameState: GameState = 'gameOver'
  private pelletsRemaining = 0
  private powerModeRemainingMs = 0
  private ghostCombo = 0
  private roundDelayRemainingMs = 0
  private currentPowerModeId = 0
  private hasStartedGame = false
  private phase = 1
  private cherryVisibleRemainingMs = 0
  private cherryRespawnRemainingMs = 0

  constructor() {
    this.pacmanStart = this.findAndClearMarker(PACMAN_MARKER)
    this.ghostStarts = this.findAndClearGhostMarkers()
    this.cherrySpawnPosition = this.findAndClearMarker(CHERRY_MARKER)

    this.actorEnvironment = {
      directions: DIRECTIONS,
      isWall: position => this.isWall(position),
      wrapCol: column => this.wrapCol(column),
    }

    this.pacman = new Pacman(
      this.pacmanStart,
      BASE_PACMAN_SPEED,
      this.actorEnvironment,
      {
        tileToPixel,
        renderCirclePixel,
        toWorldPoint,
        triangle2d: (pointA, pointB, pointC, options) =>
          triangle2d(pointA, pointB, pointC, options),
        directionToAngle,
        millis,
        tileSize: TILE_SIZE,
        radiusRatio: PACMAN_RADIUS_RATIO,
        roundDelayRemainingMs: () => this.roundDelayRemainingMs,
      },
    )

    this.ghosts = this.ghostStarts.map((start, index) => {
      return new Ghost(
        start.position,
        BASE_GHOST_SPEED,
        index % 2 === 0 ? 'left' : 'right',
        index,
        start.name,
        start.marker,
        start.color,
        this.actorEnvironment,
        {
          tileToPixel,
          renderCirclePixel,
          renderFilledRectPixel,
          millis,
          floor,
          abs,
          tileSize: TILE_SIZE,
          radiusRatio: GHOST_RADIUS_RATIO,
          powerWarningFlashMs: POWER_WARNING_FLASH_MS,
          powerWarningFlashIntervalMs: POWER_WARNING_FLASH_INTERVAL_MS,
          getPowerModeRemainingMs: () => this.powerModeRemainingMs,
          getCurrentPowerModeId: () => this.currentPowerModeId,
          getGhostHouseCenterTarget: () => this.getGhostHouseCenterTarget(),
          getGhosts: () => this.ghosts,
        },
      )
    })

    this.pelletsRemaining = this.countRemainingPellets()
    this.cherryRespawnRemainingMs = this.randomCherryRespawnDelayMs()
    this.highScore = this.loadHighScore()
  }

  drawFrame() {
    if (frameCount() % FPS_LOGGING_FRAME_PERIOD === 0)
      console.log({ fps: fps() })

    background('black')

    const now = millis()
    const deltaSeconds =
      this.lastTickMillis === null
        ? 1 / FPS
        : min((now - this.lastTickMillis) / 1000, 0.05)

    this.lastTickMillis = now

    this.update(deltaSeconds)
    this.render()
  }

  renderPaused() {
    text2d(
      'PAUSED',
      toWorldPoint(animation.width / 2, animation.height / 2 - 330),
    )
  }

  handleKeydown = (event: KeyboardEvent) => {
    resumeAudio()

    const key = event.key.toLowerCase()

    if (this.gameState === 'playing') {
      if (key === 'w' || key === 'arrowup') this.pacman.nextDir = 'up'
      else if (key === 's' || key === 'arrowdown') this.pacman.nextDir = 'down'
      else if (key === 'a' || key === 'arrowleft') this.pacman.nextDir = 'left'
      else if (key === 'd' || key === 'arrowright')
        this.pacman.nextDir = 'right'
    } else if (key === 'enter') {
      this.startGame()
    }

    if (
      [
        'w',
        'a',
        's',
        'd',
        'arrowup',
        'arrowdown',
        'arrowleft',
        'arrowright',
      ].includes(key)
    ) {
      event.preventDefault()
    }
  }

  stop() {
    stopPowerSirenLoop()
  }

  private startGame() {
    this.hasStartedGame = true
    this.score = 0
    this.lives = 3
    this.phase = 1
    this.gameState = 'playing'
    this.powerModeRemainingMs = 0
    stopPowerSirenLoop()
    this.ghostCombo = 0

    this.resetMazeFromTemplate()
    this.resetRound()
  }

  private getTile(position: Vector3d): Tile {
    return this.maze[position.y]?.[position.x] ?? WALL_MARKER
  }

  private setTile(position: Vector3d, value: Tile): void {
    this.maze[position.y][position.x] = value
  }

  private findAndClearMarker(marker: Tile): Vector3d {
    for (let row = 0; row < ROW_COUNT; row++) {
      for (let col = 0; col < COLUMN_COUNT; col++) {
        if (this.maze[row][col] === marker) {
          this.maze[row][col] = EMPTY_MARKER

          return $v(col, row)
        }
      }
    }

    throw new Error(`Marker not found: ${marker}`)
  }

  private findAndClearGhostMarkers(): GhostStart[] {
    return GHOST_MARKER_SPECS.map(spec => {
      const position = this.findAndClearMarker(spec.marker)

      return {
        ...spec,
        position,
      }
    })
  }

  private getGhostHouseCenterTarget(): Vector3d {
    const pinkyStart = this.ghostStarts.find(ghost => {
      return ghost.name === PINKY_NAME
    })

    if (pinkyStart) return pinkyStart.position.clone()

    return $v(
      floor(
        this.ghostStarts.reduce((sum, ghost) => {
          return sum + ghost.position.x
        }, 0) / this.ghostStarts.length,
      ),
      floor(
        this.ghostStarts.reduce((sum, ghost) => {
          return sum + ghost.position.y
        }, 0) / this.ghostStarts.length,
      ),
    )
  }

  private resetMazeFromTemplate() {
    timesForEachN([COLUMN_COUNT, ROW_COUNT], (col, row) => {
      this.maze[row][col] = [...MAZE_TEMPLATE[row]][col] as Tile
    })

    this.findAndClearMarker(PACMAN_MARKER)
    this.findAndClearGhostMarkers()
    this.findAndClearMarker(CHERRY_MARKER)
    this.resetCherryCycle()

    this.pelletsRemaining = this.countRemainingPellets()
  }

  private randomCherryRespawnDelayMs() {
    const bounds = this.getCherryRespawnBounds()

    return bounds.min + random() * (bounds.max - bounds.min)
  }

  private hideCherry() {
    if (this.getTile(this.cherrySpawnPosition) === CHERRY_MARKER)
      this.setTile(this.cherrySpawnPosition, EMPTY_MARKER)
  }

  private showCherry() {
    this.setTile(this.cherrySpawnPosition, CHERRY_MARKER)
  }

  private resetCherryCycle() {
    this.hideCherry()

    this.cherryVisibleRemainingMs = 0
    this.cherryRespawnRemainingMs = this.randomCherryRespawnDelayMs()
  }

  private updateCherryCycle(deltaSeconds: number) {
    const deltaMs = deltaSeconds * 1000

    if (this.cherryVisibleRemainingMs > 0) {
      this.cherryVisibleRemainingMs = max(
        0,
        this.cherryVisibleRemainingMs - deltaMs,
      )

      if (this.cherryVisibleRemainingMs <= 0) {
        this.hideCherry()
        this.cherryRespawnRemainingMs = this.randomCherryRespawnDelayMs()
      }

      return
    }

    this.cherryRespawnRemainingMs = max(
      0,
      this.cherryRespawnRemainingMs - deltaMs,
    )

    if (this.cherryRespawnRemainingMs <= 0) {
      this.showCherry()
      this.cherryVisibleRemainingMs = CHERRY_VISIBLE_MS
    }
  }

  private isWall(position: Vector3d): boolean {
    return this.getTile(position) === WALL_MARKER
  }

  private wrapCol(col: number): number {
    if (col < 0) return COLUMN_COUNT - 1
    if (col >= COLUMN_COUNT) return 0

    return col
  }

  private countRemainingPellets(): number {
    let count = 0

    timesForEachN([COLUMN_COUNT, ROW_COUNT], (col, row) => {
      const tile = this.getTile($v(col, row))

      if (tile === PELLET_MARKER || tile === POWER_PELLET_MARKER) count++
    })

    return count
  }

  private getGhostSpeed() {
    return BASE_GHOST_SPEED + (this.phase - 1) * GHOST_SPEED_INCREASE_PER_PHASE
  }

  private getPowerModeDurationMs() {
    return max(
      MIN_POWER_MODE_MS,
      POWER_MODE_MS - (this.phase - 1) * POWER_MODE_MS_DECREASE_PER_PHASE,
    )
  }

  private getCherryRespawnBounds() {
    return {
      min: max(
        MIN_CHERRY_RESPAWN_MIN_MS,
        CHERRY_RESPAWN_MIN_MS -
          (this.phase - 1) * CHERRY_RESPAWN_DECREASE_PER_PHASE,
      ),
      max: max(
        MIN_CHERRY_RESPAWN_MAX_MS,
        CHERRY_RESPAWN_MAX_MS -
          (this.phase - 1) * CHERRY_RESPAWN_DECREASE_PER_PHASE,
      ),
    }
  }

  private syncGhostSpeedsForPowerMode() {
    const baseGhostSpeed = this.getGhostSpeed()
    const ghostSpeed =
      this.powerModeRemainingMs > 0
        ? baseGhostSpeed * POWER_MODE_GHOST_SPEED_FACTOR
        : baseGhostSpeed

    this.ghosts.forEach(ghost => {
      if (ghost.isEaten) return

      ghost.speedTilesPerSecond = ghostSpeed
    })
  }

  private loadHighScore(): number {
    try {
      const stored = self.localStorage.getItem(HIGH_SCORE_STORAGE_KEY)

      if (stored === null) return 0

      const parsed = Number(stored)

      if (!Number.isFinite(parsed) || parsed < 0) return 0

      return floor(parsed)
    } catch {
      return 0
    }
  }

  private saveHighScore(value: number) {
    try {
      self.localStorage.setItem(HIGH_SCORE_STORAGE_KEY, String(value))
    } catch {
      // Ignore storage write failures to keep gameplay uninterrupted.
    }
  }

  private addScore(points: number) {
    this.score += points

    if (this.score > this.highScore) {
      this.highScore = this.score
      this.saveHighScore(this.highScore)
    }
  }

  private resetRound() {
    this.pacman.reset('left')

    this.ghosts.forEach((ghost, index) => {
      ghost.reset(index % 2 === 0 ? 'left' : 'right')
      ghost.speedTilesPerSecond = this.getGhostSpeed()
      ghost.isEaten = false
    })

    this.powerModeRemainingMs = 0
    stopPowerSirenLoop()
    this.ghostCombo = 0
    this.roundDelayRemainingMs = ROUND_START_DELAY_MS
    this.syncGhostSpeedsForPowerMode()
    this.resetCherryCycle()
  }

  private getPacmanFacing(): DirectionName {
    return this.pacman.dir !== 'none' ? this.pacman.dir : this.pacman.nextDir
  }

  private chooseGhostDirection(ghost: Ghost): DirectionName {
    if (ghost.isEaten) {
      const target = this.getGhostHouseCenterTarget()

      if (ghost.tryReviveAt(target, 'left', this.getGhostSpeed())) return 'none'

      return ghost.nextDirectionToTarget(target)
    }

    const candidates = (Object.keys(DIRECTIONS) as DirectionName[]).filter(
      dir => {
        if (dir === 'none') return false
        if (!canMove(ghost.position, dir, this.actorEnvironment)) return false

        return dir !== OPPOSITE_DIRECTIONS[ghost.dir]
      },
    )

    const directions =
      candidates.length > 0
        ? candidates
        : (Object.keys(DIRECTIONS) as DirectionName[]).filter(dir => {
            return (
              dir !== 'none' &&
              canMove(ghost.position, dir, this.actorEnvironment)
            )
          })

    if (directions.length === 0) return 'none'

    if (this.powerModeRemainingMs > 0) {
      const powerRatio = max(
        0,
        min(1, this.powerModeRemainingMs / this.getPowerModeDurationMs()),
      )
      const fleeWeight = 0.55 + powerRatio * 1.25
      const spacingWeight = 0.05 + powerRatio * 0.17
      const uncertaintyWeight = (1 - powerRatio) * 1.1
      const pacmanPos = this.pacman.positionInTiles()
      let fleeDirection = directions[0]
      let bestFleeScore = Number.NEGATIVE_INFINITY

      directions.forEach(dir => {
        const target = nextCell(ghost.position, dir, this.actorEnvironment)
        const deltaToPacman = target.clone().sub(pacmanPos)
        const fleeDistance = abs(deltaToPacman.y) + abs(deltaToPacman.x)

        const spacingBonus = this.ghosts
          .filter(other => {
            return other.id !== ghost.id
          })
          .reduce((bonus, other) => {
            const otherPos = other.positionInTiles()
            const dist = abs(target.y - otherPos.y) + abs(target.x - otherPos.x)

            return bonus + dist
          }, 0)

        const tieBreaker = ((ghost.id + dir.charCodeAt(0)) % 7) * 0.0001
        const decayJitter =
          (((ghost.id + floor(millis() / 120) + dir.charCodeAt(0)) % 11) / 10) *
          uncertaintyWeight
        const fleeScore =
          fleeDistance * fleeWeight +
          spacingBonus * spacingWeight -
          decayJitter +
          tieBreaker

        if (fleeScore > bestFleeScore) {
          bestFleeScore = fleeScore
          fleeDirection = dir
        }
      })

      return fleeDirection
    }

    const overlappingGhosts = this.ghosts.filter(other => {
      return (
        other.id !== ghost.id &&
        other.progress === 0 &&
        ghost.progress === 0 &&
        other.position.equals(ghost.position)
      )
    })

    if (overlappingGhosts.length > 0) {
      const occupiedDirections = new Set(
        overlappingGhosts.map(other => {
          return other.nextDir !== 'none' ? other.nextDir : other.dir
        }),
      )

      const freeDirections = directions.filter(dir => {
        return !occupiedDirections.has(dir)
      })

      if (freeDirections.length > 0) {
        const rotateIndex =
          (ghost.id + floor(millis() / 120)) % freeDirections.length

        return freeDirections[rotateIndex]
      }

      const rotateIndex = (ghost.id + floor(millis() / 120)) % directions.length

      return directions[rotateIndex]
    }

    const pacmanPos = this.pacman.positionInTiles()
    const chaseTarget = ghost.getChaseTarget(
      pacmanPos,
      DIRECTIONS[this.getPacmanFacing()],
      this.ghosts,
      PINKY_LOOKAHEAD_TILES,
      INKY_LOOKAHEAD_TILES,
      CLYDE_SHY_DISTANCE_TILES,
      getClydeScatterTarget,
    )

    let bestDirection = directions[0]
    let bestScore = Number.POSITIVE_INFINITY

    directions.forEach(dir => {
      const target = nextCell(ghost.position, dir, this.actorEnvironment)
      const deltaToChaseTarget = target.clone().sub(chaseTarget)
      const chaseDistance =
        abs(deltaToChaseTarget.y) + abs(deltaToChaseTarget.x)

      const crowdPenalty = this.ghosts
        .filter(other => {
          return other.id !== ghost.id
        })
        .reduce((penalty, other) => {
          const otherPos = other.positionInTiles()
          const dist = abs(target.y - otherPos.y) + abs(target.x - otherPos.x)
          const sameTilePenalty = dist < 0.35 ? 7 : 0

          return penalty + 1 / (dist + 0.45) + sameTilePenalty
        }, 0)

      const tieBreaker = ((ghost.id + dir.charCodeAt(0)) % 7) * 0.0001
      const score = chaseDistance + crowdPenalty * 0.9 + tieBreaker

      if (score < bestScore) {
        bestScore = score
        bestDirection = dir
      }
    })

    return bestDirection
  }

  private getClosestCollectibleDistance(position: Vector3d): number {
    let bestDistance = Number.POSITIVE_INFINITY

    timesForEachN([COLUMN_COUNT, ROW_COUNT], (targetCol, targetRow) => {
      const tile = this.getTile($v(targetCol, targetRow))

      if (
        tile !== PELLET_MARKER &&
        tile !== POWER_PELLET_MARKER &&
        tile !== CHERRY_MARKER
      )
        return

      const distance = abs(position.y - targetRow) + abs(position.x - targetCol)

      if (distance < bestDistance) bestDistance = distance
    })

    return bestDistance
  }

  private chooseDemoPacmanDirection(): DirectionName {
    const candidates = (Object.keys(DIRECTIONS) as DirectionName[]).filter(
      dir => {
        if (dir === 'none') return false
        if (!canMove(this.pacman.position, dir, this.actorEnvironment))
          return false

        return dir !== OPPOSITE_DIRECTIONS[this.pacman.dir]
      },
    )

    const directions =
      candidates.length > 0
        ? candidates
        : (Object.keys(DIRECTIONS) as DirectionName[]).filter(dir => {
            return (
              dir !== 'none' &&
              canMove(this.pacman.position, dir, this.actorEnvironment)
            )
          })

    if (directions.length === 0) return 'none'

    const scoredDirections = directions
      .map(dir => {
        const next = nextCell(this.pacman.position, dir, this.actorEnvironment)
        const nextTile = this.getTile(next)
        const collectibleDistance = this.getClosestCollectibleDistance(next)
        const collectibleBonus =
          nextTile === POWER_PELLET_MARKER
            ? -50
            : nextTile === PELLET_MARKER
              ? -25
              : 0
        const ghostThreat = this.ghosts.reduce((threat, ghost) => {
          const ghostPos = ghost.positionInTiles()
          const distance = abs(next.y - ghostPos.y) + abs(next.x - ghostPos.x)

          if (this.powerModeRemainingMs > 0) return threat

          return threat + 1 / (distance + 0.4)
        }, 0)
        const tieBreaker =
          ((dir.charCodeAt(0) + floor(millis() / 220)) % 7) * 0.001
        const randomJitter = random() * 0.6
        const score =
          collectibleDistance +
          ghostThreat * 7 +
          collectibleBonus +
          tieBreaker +
          randomJitter

        return { dir, score }
      })
      .sort((a, b) => {
        return a.score - b.score
      })

    const alternateRouteChance = this.powerModeRemainingMs > 0 ? 0.3 : 0.18

    if (scoredDirections.length > 1 && random() < alternateRouteChance) {
      const furthestIndex = min(
        scoredDirections.length - 1,
        this.powerModeRemainingMs > 0 ? 2 : 1,
      )
      const alternateIndex = 1 + floor(random() * furthestIndex)

      return scoredDirections[alternateIndex].dir
    }

    return scoredDirections[0].dir
  }

  private consumePacmanTile(isDemoMode = false) {
    const tile = this.getTile(this.pacman.position)

    if (tile === PELLET_MARKER) {
      this.setTile(this.pacman.position, EMPTY_MARKER)
      this.pelletsRemaining--
      if (!isDemoMode) this.addScore(10)
      if (!isDemoMode) playWaka()
    } else if (tile === POWER_PELLET_MARKER) {
      this.setTile(this.pacman.position, EMPTY_MARKER)
      this.pelletsRemaining--
      if (!isDemoMode) this.addScore(50)
      this.currentPowerModeId++
      this.powerModeRemainingMs = this.getPowerModeDurationMs()
      this.ghostCombo = 0
      this.syncGhostSpeedsForPowerMode()
      if (!isDemoMode)
        startPowerSirenLoop(
          () => {
            return this.powerModeRemainingMs
          },
          () => {
            return this.gameState === 'playing'
          },
        )
    } else if (tile === CHERRY_MARKER) {
      this.setTile(this.pacman.position, EMPTY_MARKER)
      this.hideCherry()
      this.cherryVisibleRemainingMs = 0
      this.cherryRespawnRemainingMs = this.randomCherryRespawnDelayMs()
      if (!isDemoMode) this.addScore(CHERRY_SCORE + CHERRY_EXTRA_SCORE)
      if (!isDemoMode) playCherryPickup()
    }

    if (this.pelletsRemaining <= 0) {
      if (!isDemoMode) {
        this.phase++
        stopPowerSirenLoop()
      }

      this.resetMazeFromTemplate()
      this.resetRound()
    }
  }

  private checkGhostCollisions(isDemoMode = false) {
    const pacmanPos = this.pacman.positionInTiles()

    this.ghosts.forEach(ghost => {
      if (ghost.isEaten) return

      const ghostPos = ghost.positionInTiles()
      const distance = ghostPos.dist(pacmanPos)

      if (distance > COLLISION_DISTANCE_TILES) return

      if (this.powerModeRemainingMs > 0) {
        if (ghost.lastEatenPowerModeId === this.currentPowerModeId) return

        ghost.lastEatenPowerModeId = this.currentPowerModeId
        ghost.markEaten(this.getGhostSpeed())
        if (!isDemoMode)
          this.addScore(GHOST_EATEN_BASE_SCORE * 2 ** this.ghostCombo)
        this.ghostCombo++
        if (!isDemoMode) playGhostEaten()

        return
      }

      if (isDemoMode) {
        this.resetRound()

        return
      }

      this.lives--

      if (this.lives <= 0) {
        this.gameState = 'gameOver'
        stopPowerSirenLoop()
        playDeath()

        return
      }

      this.resetRound()
    })
  }

  private update(deltaSeconds: number) {
    if (this.gameState !== 'playing') {
      if (this.roundDelayRemainingMs > 0) {
        this.roundDelayRemainingMs -= deltaSeconds * 1000

        return
      }

      const hadPowerMode = this.powerModeRemainingMs > 0

      this.powerModeRemainingMs = max(
        0,
        this.powerModeRemainingMs - deltaSeconds * 1000,
      )

      if (hadPowerMode && this.powerModeRemainingMs <= 0) {
        stopPowerSirenLoop()
        this.syncGhostSpeedsForPowerMode()
      }

      this.pacman.move(deltaSeconds, () => this.chooseDemoPacmanDirection())

      this.consumePacmanTile(true)

      this.ghosts.forEach(ghost => {
        ghost.move(deltaSeconds, actor => {
          return this.chooseGhostDirection(actor as Ghost)
        })
      })

      this.checkGhostCollisions(true)

      return
    }

    if (this.roundDelayRemainingMs > 0) {
      this.roundDelayRemainingMs -= deltaSeconds * 1000

      return
    }

    const hadPowerMode = this.powerModeRemainingMs > 0

    this.powerModeRemainingMs = max(
      0,
      this.powerModeRemainingMs - deltaSeconds * 1000,
    )

    if (hadPowerMode && this.powerModeRemainingMs <= 0) {
      stopPowerSirenLoop()
      this.syncGhostSpeedsForPowerMode()
    }

    this.updateCherryCycle(deltaSeconds)

    if (
      this.pacman.canMoveTo(this.pacman.nextDir) &&
      this.pacman.progress === 0
    )
      this.pacman.dir = this.pacman.nextDir

    this.pacman.move(deltaSeconds)

    this.consumePacmanTile()

    this.ghosts.forEach(ghost => {
      ghost.move(deltaSeconds, actor => {
        return this.chooseGhostDirection(actor as Ghost)
      })
    })

    this.checkGhostCollisions()
  }

  private renderMaze() {
    timesForEachN([COLUMN_COUNT, ROW_COUNT], (col, row) => {
      const tile = this.getTile($v(col, row))
      const pixel = tileToPixel(col, row)

      switch (tile) {
        case WALL_MARKER:
          renderWall(pixel)
          break
        case PELLET_MARKER:
          renderPellet(pixel)
          break
        case POWER_PELLET_MARKER:
          renderPowerPellet(pixel)
          break
        case CHERRY_MARKER:
          renderCherry(pixel)
          break
      }
    })
  }

  private renderHud() {
    text2d(`Score: ${this.score}`, toWorldPoint(20, 60), '#f4f4f4', {
      fontSize: 18,
      fontFamily: 'monospace',
      fontWeight: 'bold',
      textAlign: 'left',
      textBaseline: 'middle',
    })
    text2d(`Lives: ${this.lives}`, toWorldPoint(20, 84), '#f4f4f4', {
      fontSize: 18,
      fontFamily: 'monospace',
      fontWeight: 'bold',
      textAlign: 'left',
      textBaseline: 'middle',
    })
    text2d(`High Score: ${this.highScore}`, toWorldPoint(20, 108), '#f4f4f4', {
      fontSize: 18,
      fontFamily: 'monospace',
      fontWeight: 'bold',
      textAlign: 'left',
      textBaseline: 'middle',
    })
    text2d(`Phase: ${this.phase}`, toWorldPoint(20, 132), '#f4f4f4', {
      fontSize: 18,
      fontFamily: 'monospace',
      fontWeight: 'bold',
      textAlign: 'left',
      textBaseline: 'middle',
    })
    text2d(
      'Move: Arrow Keys / WASD',
      toWorldPoint(20, animation.height - 24),
      '#f4f4f4',
      {
        fontSize: 18,
        fontFamily: 'monospace',
        fontWeight: 'bold',
        textAlign: 'left',
        textBaseline: 'middle',
      },
    )
  }

  private renderStateOverlay() {
    if (!this.hasStartedGame) {
      renderFilledRectPixel(
        0,
        0,
        animation.width,
        animation.height,
        'rgba(0, 0, 0, 0.55)',
        0.75,
      )

      text2d('DEMO MODE', toWorldPoint(animation.width / 2, 70), '#ffde59', {
        fontSize: 34,
        fontFamily: 'monospace',
        fontWeight: 'bold',
        textAlign: 'center',
        textBaseline: 'middle',
      })
      text2d(
        'Press Enter to play',
        toWorldPoint(animation.width / 2, 70 + 40),
        '#ffffff',
        {
          fontSize: 20,
          fontFamily: 'monospace',
          fontWeight: 'bold',
          textAlign: 'center',
          textBaseline: 'middle',
        },
      )

      return
    }

    if (this.roundDelayRemainingMs > 0 && this.gameState === 'playing') {
      renderFilledRectPixel(
        0,
        0,
        animation.width,
        animation.height,
        'rgba(0, 0, 0, 0.45)',
      )
      text2d('READY!', toWorldPoint(animation.width / 2, 70), '#ffde59', {
        fontSize: 26,
        fontFamily: 'monospace',
        fontWeight: 'bold',
        textAlign: 'center',
        textBaseline: 'middle',
      })

      return
    }

    if (this.gameState === 'playing') return

    renderFilledRectPixel(
      0,
      0,
      animation.width,
      animation.height,
      'rgba(0, 0, 0, 0.6)',
    )

    const message = this.gameState === 'won' ? 'YOU WIN' : 'GAME OVER'

    text2d(message, toWorldPoint(animation.width / 2, 70), '#ffffff', {
      fontSize: 36,
      fontFamily: 'monospace',
      fontWeight: 'bold',
      textAlign: 'center',
      textBaseline: 'middle',
    })
    text2d(
      'Press Enter to play again',
      toWorldPoint(animation.width / 2, 70 + 40),
      '#ffffff',
      {
        fontSize: 20,
        fontFamily: 'monospace',
        fontWeight: 'bold',
        textAlign: 'center',
        textBaseline: 'middle',
      },
    )
  }

  private render() {
    this.renderMaze()

    this.pacman.render()
    this.ghosts.forEach(ghost => {
      ghost.render()
    })

    this.renderHud()
    this.renderStateOverlay()
  }
}

const game = new Game()

const { start: startFrameLoop, stop: stopFrameLoop } = createFrameLoop(
  () => {
    resetTransformationMatrix()
    game.drawFrame()
    render3dScene()
  },
  () => {
    game.renderPaused()
  },
  FPS,
)

let isListeningToKeyboard = false

function start() {
  if (!isListeningToKeyboard) {
    document.addEventListener('keydown', game.handleKeydown)
    isListeningToKeyboard = true
  }

  startFrameLoop()
}

function stop() {
  if (isListeningToKeyboard) {
    document.removeEventListener('keydown', game.handleKeydown)
    isListeningToKeyboard = false
  }

  game.stop()
  stopFrameLoop()
}

export { start, stop }
