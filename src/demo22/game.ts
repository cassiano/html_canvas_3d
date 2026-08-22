import { FPS, FPS_LOGGING_FRAME_PERIOD } from '../constants.ts'
import { millis, frameCount, fps, timesForEachN } from '../utils.ts'
import { animation, background } from '../primitives.ts'
import { abs, floor, max, min, random } from '../math_utils.ts'
import { $v, Vector3d } from '../vector_3d.ts'
import { text2d } from '../primitives.ts'
import {
  playCherryPickup,
  playDeath,
  playGhostEaten,
  playWaka,
  resumeAudio,
  startPowerSirenLoop,
  stopPowerSirenLoop,
} from './audio.ts'
import { Ghost } from './ghost.ts'
import { Pacman } from './pacman.ts'
import {
  renderCherry,
  renderFilledRectPixel,
  renderPellet,
  renderPowerPellet,
  renderWall,
  tileToPixel,
  toWorldPoint,
} from './render.ts'
import {
  DirectionName,
  BASE_GHOST_SPEED,
  BASE_PACMAN_SPEED,
  BLINKY_MARKER,
  BLINKY_NAME,
  CHERRY_MARKER,
  CHERRY_RESPAWN_DECREASE_PER_PHASE,
  CHERRY_RESPAWN_MAX_MS,
  CHERRY_RESPAWN_MIN_MS,
  CHERRY_VISIBLE_MS,
  CLYDE_MARKER,
  CLYDE_NAME,
  COLLISION_DISTANCE_TILES,
  COLUMN_COUNT,
  DIRECTIONS,
  ATTRACT_POWER_MODE_MS,
  EMPTY_MARKER,
  GHOST_EATEN_BASE_SCORE,
  GHOST_MARKER_SPECS,
  GHOST_SPEED_INCREASE_PER_PHASE,
  HIGH_SCORE_STORAGE_KEY,
  INKY_MARKER,
  INKY_NAME,
  MAZE_TEMPLATE,
  MIN_CHERRY_RESPAWN_MAX_MS,
  MIN_CHERRY_RESPAWN_MIN_MS,
  MIN_POWER_MODE_MS,
  OPPOSITE_DIRECTIONS,
  PACMAN_MARKER,
  PINKY_MARKER,
  PINKY_NAME,
  PELLET_MARKER,
  POWER_MODE_GHOST_SPEED_FACTOR,
  POWER_MODE_MS,
  POWER_MODE_MS_DECREASE_PER_PHASE,
  POWER_PELLET_MARKER,
  ROUND_START_DELAY_MS,
  ROW_COUNT,
  WALL_MARKER,
  LEFT,
  RIGHT,
  UP,
  DOWN,
  NONE,
} from './constants.ts'
import { Actor } from './actor.ts'
import {
  EXTRA_LIFE_SCORE_THRESHOLD,
  PACMAN_STARTING_LIVES,
  COLLECTIBLE_SCORES,
} from './constants.ts'

type GameState = 'playing' | 'gameOver'

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

// [/doc_img/game.ts/2026-08-08-12-04-06.png]
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

type HighScoreRecord = {
  score: number
  phase: number
}

export class Game {
  private readonly maze: Tile[][]
  private readonly pacmanStart: Vector3d
  private readonly ghostStarts: GhostStart[]
  private readonly cherrySpawnPosition: Vector3d
  private readonly pacman: Pacman
  private readonly ghosts: Ghost[]

  private lastTickMillis: number | null = null
  private score = 0
  private highScore = 0
  private highScorePhase = 1
  private lives = PACMAN_STARTING_LIVES
  private gameState: GameState = 'gameOver'
  private pelletsRemaining = 0
  private powerModeRemainingMs = 0
  private ghostCombo = 0

  // roundDelayRemainingMs is the countdown (in milliseconds) for the "READY!" pause shown at
  // the start of each round — it's set to ROUND_START_DELAY_MS in resetRound() and counted down
  // in update(); while it's above zero, actor movement and pellet/collision logic are skipped
  // so the maze freezes briefly before play resumes.
  private roundDelayRemainingMs = 0

  private currentPowerModeId = 0
  private hasStartedGame = false
  private phase = 1
  private cherryVisibleRemainingMs = 0
  private cherryRespawnRemainingMs = 0

  constructor() {
    // Copy the immutable template so gameplay can consume pellets and replace
    // markers without mutating the source maze shared by future rounds.
    this.maze = MAZE_TEMPLATE.map(line => Array.from(line) as Tile[])

    this.pacmanStart = this.findAndClearMarker(PACMAN_MARKER)
    this.ghostStarts = this.findAndClearGhostMarkers()
    this.cherrySpawnPosition = this.findAndClearMarker(CHERRY_MARKER)

    Actor.configureWallCheck(position => this.isWall(position))

    this.pacman = new Pacman(this.pacmanStart, BASE_PACMAN_SPEED)

    this.ghosts = this.ghostStarts.map(
      (start, index) =>
        new Ghost(
          start.position,
          BASE_GHOST_SPEED,
          index % 2 === 0 ? LEFT : RIGHT,
          index,
          start.name,
          start.marker,
          start.color,
        ),
    )

    this.pelletsRemaining = this.countRemainingPellets()
    this.cherryRespawnRemainingMs = this.randomCherryRespawnDelayMs()
    const highScoreRecord = this.loadHighScore()
    this.highScore = highScoreRecord.score
    this.highScorePhase = highScoreRecord.phase
  }

  drawFrame() {
    if (frameCount() % FPS_LOGGING_FRAME_PERIOD === 0)
      console.log({ fps: fps() })

    background('black')

    // Clamp elapsed time so a paused tab or dropped frame cannot teleport
    // actors through walls or make timed effects expire in one update.
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
      if (key === 'w' || key === 'arrowup') this.pacman.nextDir = UP
      else if (key === 's' || key === 'arrowdown') this.pacman.nextDir = DOWN
      else if (key === 'a' || key === 'arrowleft') this.pacman.nextDir = LEFT
      else if (key === 'd' || key === 'arrowright') this.pacman.nextDir = RIGHT
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

  private inPowerMode() {
    return this.powerModeRemainingMs > 0
  }

  private isGhostFrightened(ghost: Ghost): boolean {
    // A ghost already eaten during this power-mode cycle stays a normal
    // chaser until revived and re-frightened by a future power pellet.
    return (
      this.inPowerMode() &&
      !ghost.isEaten &&
      ghost.lastEatenPowerModeId !== this.currentPowerModeId
    )
  }

  private startGame() {
    // A new game resets score and lives, while the high score intentionally
    // survives through localStorage and is not cleared here.
    this.hasStartedGame = true
    this.score = 0
    this.lives = PACMAN_STARTING_LIVES
    this.phase = 1
    this.gameState = 'playing'
    this.powerModeRemainingMs = 0
    stopPowerSirenLoop()
    this.ghostCombo = 0

    this.resetMazeFromTemplate()
    this.resetRound()
  }

  private getTile(actor: Actor): Tile
  private getTile(position: Vector3d): Tile
  private getTile(row: number, col: number): Tile
  private getTile(
    actorOrPositionOrRow: Actor | Vector3d | number,
    col?: number,
  ): Tile {
    const position =
      typeof actorOrPositionOrRow === 'number'
        ? $v(col!, actorOrPositionOrRow)
        : actorOrPositionOrRow instanceof Actor
          ? actorOrPositionOrRow.position
          : actorOrPositionOrRow

    return this.maze[position.y][position.x] ?? WALL_MARKER
  }

  private setTile(actor: Actor, value: Tile): void
  private setTile(position: Vector3d, value: Tile): void
  private setTile(actorOrPosition: Actor | Vector3d, value: Tile): void {
    const position =
      actorOrPosition instanceof Actor
        ? actorOrPosition.position
        : actorOrPosition

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
    const pinkyStart = this.ghostStarts.find(ghost => ghost.name === PINKY_NAME)

    if (pinkyStart) return pinkyStart.position.clone()

    return $v(
      floor(
        this.ghostStarts.reduce((sum, ghost) => sum + ghost.position.x, 0) /
          this.ghostStarts.length,
      ),
      floor(
        this.ghostStarts.reduce((sum, ghost) => sum + ghost.position.y, 0) /
          this.ghostStarts.length,
      ),
    )
  }

  private resetMazeFromTemplate() {
    // Restore every tile, then remove spawn markers again because actors keep
    // their start positions separately from the visible maze contents.
    timesForEachN([COLUMN_COUNT, ROW_COUNT], (col, row) => {
      this.maze[row][col] = Array.from(MAZE_TEMPLATE[row])[col] as Tile
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
    // Cherry timing alternates between a hidden respawn countdown and a
    // visible lifetime; only one timer is active in either state.
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

  private countRemainingPellets(): number {
    let count = 0

    timesForEachN([COLUMN_COUNT, ROW_COUNT], (col, row) => {
      const tile = this.getTile(row, col)

      if (tile === PELLET_MARKER || tile === POWER_PELLET_MARKER) count++
    })

    return count
  }

  private getGhostSpeed() {
    return BASE_GHOST_SPEED + (this.phase - 1) * GHOST_SPEED_INCREASE_PER_PHASE
  }

  private getPowerModeDurationMs() {
    // The attract loop extends power mode so attract-mode viewers see
    // frightened-ghost gameplay for longer than a player would.
    if (this.gameState !== 'playing') return ATTRACT_POWER_MODE_MS

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
    // Frightened ghosts slow down, while eaten ghosts retain their return-home
    // speed until they are revived.
    const baseGhostSpeed = this.getGhostSpeed()

    this.ghosts.forEach(ghost => {
      if (ghost.isEaten) return

      ghost.speedTilesPerSecond = this.isGhostFrightened(ghost)
        ? baseGhostSpeed * POWER_MODE_GHOST_SPEED_FACTOR
        : baseGhostSpeed
    })
  }

  private loadHighScore(): HighScoreRecord {
    // Accept old numeric saves as phase-one records, but validate new object
    // saves so corrupt localStorage cannot produce invalid HUD state.
    try {
      const stored = self.localStorage.getItem(HIGH_SCORE_STORAGE_KEY)

      if (stored === null) return { score: 0, phase: 1 }

      const parsed = JSON.parse(stored) as unknown

      if (typeof parsed === 'number') {
        return Number.isFinite(parsed) && parsed >= 0
          ? { score: floor(parsed), phase: 1 }
          : { score: 0, phase: 1 }
      }

      if (typeof parsed !== 'object' || parsed === null)
        return { score: 0, phase: 1 }

      const record = parsed as Record<string, unknown>
      const score = record.score
      const phase = record.phase

      if (
        typeof score !== 'number' ||
        !Number.isFinite(score) ||
        score < 0 ||
        typeof phase !== 'number' ||
        !Number.isFinite(phase) ||
        phase < 1
      )
        return { score: 0, phase: 1 }

      return { score: floor(score), phase: floor(phase) }
    } catch {
      return { score: 0, phase: 1 }
    }
  }

  private saveHighScore(record: HighScoreRecord) {
    try {
      self.localStorage.setItem(HIGH_SCORE_STORAGE_KEY, JSON.stringify(record))
    } catch {
      // Ignore storage write failures to keep gameplay uninterrupted.
    }
  }

  private addScore(points: number) {
    // Award an extra life for every threshold the score crosses, so multiple
    // crossings within one pickup still grant one life per full threshold.
    const previousThresholdIndex = floor(
      this.score / EXTRA_LIFE_SCORE_THRESHOLD,
    )

    this.score += points

    if (this.score > this.highScore) {
      this.highScore = this.score
      this.highScorePhase = this.phase
      this.saveHighScore({ score: this.highScore, phase: this.highScorePhase })
    }

    if (floor(this.score / EXTRA_LIFE_SCORE_THRESHOLD) > previousThresholdIndex)
      this.lives++
  }

  private resetRound() {
    // A life loss or maze clear restarts positions and timers without resetting
    // score, lives, or the current difficulty phase.
    this.pacman.reset(LEFT)

    this.ghosts.forEach((ghost, index) => {
      ghost.reset(index % 2 === 0 ? LEFT : RIGHT)
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
    return this.pacman.dir !== NONE ? this.pacman.dir : this.pacman.nextDir
  }

  private chooseGhostDirection(ghost: Ghost): DirectionName {
    // Ghosts choose at tile centers. Eaten ghosts path home; frightened ghosts
    // maximize separation; normal ghosts minimize chase distance plus crowding.
    if (ghost.isEaten) {
      const target = this.getGhostHouseCenterTarget()

      if (ghost.tryReviveAt(target, LEFT, this.getGhostSpeed())) return NONE

      return ghost.nextDirectionToTarget(target)
    }

    const candidates = (Object.keys(DIRECTIONS) as DirectionName[]).filter(
      direction => {
        if (direction === NONE) return false
        if (!ghost.canMoveTo(direction)) return false

        return direction !== OPPOSITE_DIRECTIONS[ghost.dir]
      },
    )

    const directions =
      candidates.length > 0
        ? candidates
        : (Object.keys(DIRECTIONS) as DirectionName[]).filter(
            direction => direction !== NONE && ghost.canMoveTo(direction),
          )

    if (directions.length === 0) return NONE

    if (this.isGhostFrightened(ghost)) {
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

      directions.forEach(direction => {
        const target = ghost.nextCell(direction)
        const deltaToPacman = target.clone().sub(pacmanPos)
        const fleeDistance = abs(deltaToPacman.y) + abs(deltaToPacman.x)

        const spacingBonus = this.ghosts
          .filter(other => other.id !== ghost.id)
          .reduce((bonus, other) => {
            const otherPos = other.positionInTiles()
            const dist = abs(target.y - otherPos.y) + abs(target.x - otherPos.x)

            return bonus + dist
          }, 0)

        const tieBreaker = ((ghost.id + direction.charCodeAt(0)) % 7) * 0.0001
        const decayJitter =
          (((ghost.id + floor(millis() / 120) + direction.charCodeAt(0)) % 11) /
            10) *
          uncertaintyWeight
        const fleeScore =
          fleeDistance * fleeWeight +
          spacingBonus * spacingWeight -
          decayJitter +
          tieBreaker

        if (fleeScore > bestFleeScore) {
          bestFleeScore = fleeScore
          fleeDirection = direction
        }
      })

      return fleeDirection
    }

    const overlappingGhosts = this.ghosts.filter(
      other =>
        other.id !== ghost.id &&
        other.progress === 0 &&
        ghost.progress === 0 &&
        other.position.equals(ghost.position),
    )

    if (overlappingGhosts.length > 0) {
      const occupiedDirections = new Set(
        overlappingGhosts.map(other =>
          other.nextDir !== NONE ? other.nextDir : other.dir,
        ),
      )

      const freeDirections = directions.filter(direction => {
        return !occupiedDirections.has(direction)
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
    )

    let bestDirection = directions[0]
    let bestScore = Number.POSITIVE_INFINITY

    directions.forEach(direction => {
      const target = ghost.nextCell(direction)
      const deltaToChaseTarget = target.clone().sub(chaseTarget)
      const chaseDistance =
        abs(deltaToChaseTarget.y) + abs(deltaToChaseTarget.x)

      const crowdPenalty = this.ghosts
        .filter(other => other.id !== ghost.id)
        .reduce((penalty, other) => {
          const otherPos = other.positionInTiles()
          const dist = abs(target.y - otherPos.y) + abs(target.x - otherPos.x)
          const sameTilePenalty = dist < 0.35 ? 7 : 0

          return penalty + 1 / (dist + 0.45) + sameTilePenalty
        }, 0)

      const tieBreaker = ((ghost.id + direction.charCodeAt(0)) % 7) * 0.0001
      const score = chaseDistance + crowdPenalty * 0.9 + tieBreaker

      if (score < bestScore) {
        bestScore = score
        bestDirection = direction
      }
    })

    return bestDirection
  }

  private getClosestCollectibleDistance(position: Vector3d): number {
    // This intentionally uses Manhattan distance: the method is a cheap local
    // heuristic for the attract-mode driver, not a full pathfinding query.
    let shortestDistance = Number.POSITIVE_INFINITY

    timesForEachN([COLUMN_COUNT, ROW_COUNT], (col, row) => {
      const tile = this.getTile(row, col)

      if (
        tile === PELLET_MARKER ||
        tile === POWER_PELLET_MARKER ||
        tile === CHERRY_MARKER
      ) {
        const distance = position.manhattanDist(col, row)

        if (distance < shortestDistance) shortestDistance = distance
      }
    })

    return shortestDistance
  }

  // https://drive.google.com/file/d/1EjJiVstVLq4C_HHFdc6ZI01UdJZ6dQ3D/view?usp=sharing, https://aistudio.google.com/app/prompts?state=%7B%22ids%22:%5B%221QxqF4E22VIbEok8RgHujB2gdbe-Nesmc%22%5D,%22action%22:%22open%22,%22userId%22:%22113757018662815530084%22,%22resourceKeys%22:%7B%7D%7D&usp=sharing
  private chooseAttractModePacmanDirection(): DirectionName {
    // Keep Pacman moving forward when possible; reversing is only a fallback
    // when the current corridor has no other legal exit.
    const candidates = (Object.keys(DIRECTIONS) as DirectionName[]).filter(
      direction => {
        if ([NONE, OPPOSITE_DIRECTIONS[this.pacman.dir]].includes(direction))
          return false

        return this.pacman.canMoveTo(direction)
      },
    )

    const directions =
      candidates.length > 0
        ? candidates
        : // Fallback to reversing if Pacman is trapped in a dead end. This is rare but
          // possible in the attract-mode maze, and it prevents Pacman from getting stuck.
          (Object.keys(DIRECTIONS) as DirectionName[]).filter(
            direction => direction !== NONE && this.pacman.canMoveTo(direction),
          )

    if (directions.length === 0) return NONE
    if (directions.length === 1) return directions[0]

    const frightenedGhosts = this.ghosts.filter(ghost =>
      this.isGhostFrightened(ghost),
    )
    const isHuntingGhosts = frightenedGhosts.length > 0

    // Score each exit: in normal mode, prioritize pellets/cherries and avoid
    // lethal ghosts; in power mode with frightened ghosts present, aggressively
    // hunt down and close distance on the nearest edible ghost.
    const scoredDirections = directions
      .map(direction => {
        const next = this.pacman.nextCell(direction)
        const nextTile = this.getTile(next)

        // Base food distance heuristic.
        const collectibleDistance = this.getClosestCollectibleDistance(next)

        // Pellet / power pellet bonuses.
        const collectibleBonus =
          nextTile === POWER_PELLET_MARKER && !this.inPowerMode()
            ? -50
            : nextTile === PELLET_MARKER
              ? -25
              : 0

        // In normal mode, ghosts are dangerous threats. In power mode, dangerous
        // non-frightened ghosts (if any) are avoided while frightened ghosts become targets.
        const nonFrightenedGhosts = this.ghosts.filter(
          ghost => !ghost.isEaten && !this.isGhostFrightened(ghost),
        )

        const ghostThreat = nonFrightenedGhosts.reduce((threat, ghost) => {
          const ghostPos = ghost.positionInTiles()
          const distance = next.manhattanDist(ghostPos)

          return threat + 1 / (distance + 0.4)
        }, 0)

        // Chase metric: calculate distance to closest frightened ghost.
        let ghostChaseScore = 0
        if (isHuntingGhosts) {
          const closestFrightenedDist = min(
            ...frightenedGhosts.map(ghost =>
              next.manhattanDist(ghost.positionInTiles()),
            ),
          )

          // Strongly minimize distance to closest frightened ghost.
          ghostChaseScore = closestFrightenedDist * 18
        }

        // Deterministic variation to break ties cleanly.
        const tieBreaker =
          ((direction.charCodeAt(0) + floor(millis() / 220)) % 7) * 0.001

        const randomJitter = isHuntingGhosts ? 0 : random() * 0.6

        const score = isHuntingGhosts
          ? ghostChaseScore +
            collectibleDistance * 0.2 +
            ghostThreat * 15 +
            tieBreaker
          : collectibleDistance +
            ghostThreat * 7 +
            collectibleBonus +
            tieBreaker +
            randomJitter

        return { dir: direction, score }
      })
      .sort((a, b) => a.score - b.score)

    // In normal mode, occasionally explore alternate paths. When hunting ghosts
    // in power mode, stay strictly focused on the optimal pursuit course.
    const alternateRouteChance = isHuntingGhosts ? 0 : 0.18

    if (scoredDirections.length > 1 && random() < alternateRouteChance) {
      const alternateIndex = 1 + floor(random() * (scoredDirections.length - 1))

      return scoredDirections[alternateIndex].dir
    }

    return scoredDirections[0].dir
  }

  private consumePacmanTile(isAttractMode = false) {
    // Attract mode mutates the maze and advances phases but suppresses player-only
    // scoring and audio, allowing the attract loop to run indefinitely.
    const tile = this.getTile(this.pacman)

    switch (tile) {
      case PELLET_MARKER:
        this.setTile(this.pacman, EMPTY_MARKER)
        this.pelletsRemaining--

        if (!isAttractMode) {
          this.addScore(COLLECTIBLE_SCORES[PELLET_MARKER])
          playWaka()
        }
        break

      case POWER_PELLET_MARKER:
        this.setTile(this.pacman, EMPTY_MARKER)
        this.pelletsRemaining--

        if (!isAttractMode)
          this.addScore(COLLECTIBLE_SCORES[POWER_PELLET_MARKER])

        this.currentPowerModeId++
        this.powerModeRemainingMs = this.getPowerModeDurationMs()
        this.ghostCombo = 0
        this.syncGhostSpeedsForPowerMode()

        if (!isAttractMode)
          startPowerSirenLoop(
            () => this.powerModeRemainingMs,
            () => this.gameState === 'playing',
          )
        break

      case CHERRY_MARKER:
        this.setTile(this.pacman, EMPTY_MARKER)
        this.hideCherry()
        this.cherryVisibleRemainingMs = 0
        this.cherryRespawnRemainingMs = this.randomCherryRespawnDelayMs()

        if (!isAttractMode) {
          this.addScore(
            COLLECTIBLE_SCORES[CHERRY_MARKER].score +
              COLLECTIBLE_SCORES[CHERRY_MARKER].extra,
          )

          playCherryPickup()
        }
        break
    }

    if (this.pelletsRemaining <= 0) {
      this.phase++

      if (!isAttractMode) stopPowerSirenLoop()

      this.resetMazeFromTemplate()
      this.resetRound()
    }
  }

  private checkGhostCollisions(isAttractMode = false) {
    // Collision handling is ordered from edible ghosts to lethal ghosts, with
    // attract mode resetting the round instead of consuming a player life.
    const pacmanPos = this.pacman.positionInTiles()

    this.ghosts.forEach(ghost => {
      if (ghost.isEaten) return

      const ghostPos = ghost.positionInTiles()
      const distance = ghostPos.dist(pacmanPos)

      if (distance > COLLISION_DISTANCE_TILES) return

      if (this.isGhostFrightened(ghost)) {
        ghost.lastEatenPowerModeId = this.currentPowerModeId
        ghost.markEaten(this.getGhostSpeed())

        if (!isAttractMode)
          this.addScore(GHOST_EATEN_BASE_SCORE * 2 ** this.ghostCombo)

        this.ghostCombo++

        if (!isAttractMode) playGhostEaten()

        return
      }

      if (isAttractMode) {
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
    // Before Enter, the game runs an attract mode. It uses the same actors and
    // maze rules as play, but supplies an automatic Pacman direction and no
    // player-facing score or sound effects.
    if (this.gameState !== 'playing') {
      if (this.roundDelayRemainingMs > 0) {
        this.roundDelayRemainingMs -= deltaSeconds * 1000

        return
      }

      const hadPowerMode = this.inPowerMode()

      this.powerModeRemainingMs = max(
        0,
        this.powerModeRemainingMs - deltaSeconds * 1000,
      )

      if (hadPowerMode && !this.inPowerMode()) {
        stopPowerSirenLoop()
        this.syncGhostSpeedsForPowerMode()
      }

      this.pacman.move(deltaSeconds, () =>
        this.chooseAttractModePacmanDirection(),
      )

      this.consumePacmanTile(true)

      this.ghosts.forEach(ghost =>
        ghost.move(deltaSeconds, actor =>
          this.chooseGhostDirection(actor as Ghost),
        ),
      )

      this.checkGhostCollisions(true)

      return
    }

    // Player mode keeps input-driven direction changes and cherry timing while
    // sharing movement, pellet consumption, and collision behavior with attract mode.
    if (this.roundDelayRemainingMs > 0) {
      this.roundDelayRemainingMs -= deltaSeconds * 1000

      return
    }

    const hadPowerMode = this.inPowerMode()

    this.powerModeRemainingMs = max(
      0,
      this.powerModeRemainingMs - deltaSeconds * 1000,
    )

    if (hadPowerMode && !this.inPowerMode()) {
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
      ghost.move(deltaSeconds, actor =>
        this.chooseGhostDirection(actor as Ghost),
      )
    })

    this.checkGhostCollisions()
  }

  private renderMaze() {
    // Actors are drawn separately so their fractional positions can animate;
    // this pass only renders static maze tile content.
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
    text2d(`Phase: ${this.phase}`, toWorldPoint(20, 108), '#f4f4f4', {
      fontSize: 18,
      fontFamily: 'monospace',
      fontWeight: 'bold',
      textAlign: 'left',
      textBaseline: 'middle',
    })
    text2d(
      `HIGH SCORE: ${this.highScore} (PHASE ${this.highScorePhase})`,
      toWorldPoint(20, 140),
      '#f4f4f4',
      {
        fontSize: 18,
        fontFamily: 'monospace',
        fontWeight: 'bold',
        textAlign: 'left',
        textBaseline: 'middle',
      },
    )
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

      text2d('INSERT COIN', toWorldPoint(animation.width / 2, 70), '#ffde59', {
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

    text2d('INSERT COIN', toWorldPoint(animation.width / 2, 70), '#ffffff', {
      fontSize: 36,
      fontFamily: 'monospace',
      fontWeight: 'bold',
      textAlign: 'center',
      textBaseline: 'middle',
    })
    text2d(
      'GAME OVER - Press Enter to play again',
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
    // Render order places the maze behind actors and the HUD/overlay above both.
    this.renderMaze()

    this.pacman.render(() => this.roundDelayRemainingMs)

    this.ghosts.forEach(ghost => {
      ghost.render(
        () => this.powerModeRemainingMs,
        () => this.currentPowerModeId,
      )
    })

    this.renderHud()

    this.renderStateOverlay()
  }

  private isWall(position: Vector3d): boolean {
    return (this.maze[position.y]?.[position.x] ?? WALL_MARKER) === WALL_MARKER
  }
}
