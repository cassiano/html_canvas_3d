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
import { canMove, configureWallCheck, nextCell } from './actor.ts'
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
  DIRECTION_MAP,
  DirectionName,
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
  PINKY_LOOKAHEAD_TILES,
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

type HighScoreRecord = {
  score: number
  phase: number
}

class Game {
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
  private lives = 3
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

    configureWallCheck(position => this.isWall(position))

    this.pacman = new Pacman(this.pacmanStart, BASE_PACMAN_SPEED)

    this.ghosts = this.ghostStarts.map(
      (start, index) =>
        new Ghost(
          start.position,
          BASE_GHOST_SPEED,
          index % 2 === 0 ? DIRECTION_MAP.left : DIRECTION_MAP.right,
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
      if (key === 'w' || key === 'arrowup')
        this.pacman.nextDir = DIRECTION_MAP.up
      else if (key === 's' || key === 'arrowdown')
        this.pacman.nextDir = DIRECTION_MAP.down
      else if (key === 'a' || key === 'arrowleft')
        this.pacman.nextDir = DIRECTION_MAP.left
      else if (key === 'd' || key === 'arrowright')
        this.pacman.nextDir = DIRECTION_MAP.right
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
      ghost.lastEatenPowerModeId !== this.currentPowerModeId
    )
  }

  private startGame() {
    // A new game resets score and lives, while the high score intentionally
    // survives through localStorage and is not cleared here.
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
    return this.maze[position.y][position.x] ?? WALL_MARKER
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
    this.score += points

    if (this.score > this.highScore) {
      this.highScore = this.score
      this.highScorePhase = this.phase
      this.saveHighScore({ score: this.highScore, phase: this.highScorePhase })
    }
  }

  private resetRound() {
    // A life loss or maze clear restarts positions and timers without resetting
    // score, lives, or the current difficulty phase.
    this.pacman.reset(DIRECTION_MAP.left)

    this.ghosts.forEach((ghost, index) => {
      ghost.reset(index % 2 === 0 ? DIRECTION_MAP.left : DIRECTION_MAP.right)
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
    return this.pacman.dir !== DIRECTION_MAP.none
      ? this.pacman.dir
      : this.pacman.nextDir
  }

  private chooseGhostDirection(ghost: Ghost): DirectionName {
    // Ghosts choose at tile centers. Eaten ghosts path home; frightened ghosts
    // maximize separation; normal ghosts minimize chase distance plus crowding.
    if (ghost.isEaten) {
      const target = this.getGhostHouseCenterTarget()

      if (ghost.tryReviveAt(target, DIRECTION_MAP.left, this.getGhostSpeed()))
        return DIRECTION_MAP.none

      return ghost.nextDirectionToTarget(target)
    }

    const candidates = (Object.keys(DIRECTIONS) as DirectionName[]).filter(
      dir => {
        if (dir === DIRECTION_MAP.none) return false
        if (!canMove(ghost.position, dir)) return false

        return dir !== OPPOSITE_DIRECTIONS[ghost.dir]
      },
    )

    const directions =
      candidates.length > 0
        ? candidates
        : (Object.keys(DIRECTIONS) as DirectionName[]).filter(
            dir => dir !== DIRECTION_MAP.none && canMove(ghost.position, dir),
          )

    if (directions.length === 0) return DIRECTION_MAP.none

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

      directions.forEach(dir => {
        const target = nextCell(ghost.position, dir)
        const deltaToPacman = target.clone().sub(pacmanPos)
        const fleeDistance = abs(deltaToPacman.y) + abs(deltaToPacman.x)

        const spacingBonus = this.ghosts
          .filter(other => other.id !== ghost.id)
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
          other.nextDir !== DIRECTION_MAP.none ? other.nextDir : other.dir,
        ),
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
    )

    let bestDirection = directions[0]
    let bestScore = Number.POSITIVE_INFINITY

    directions.forEach(dir => {
      const target = nextCell(ghost.position, dir)
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
    // This intentionally uses Manhattan distance: the method is a cheap local
    // heuristic for the demo driver, not a full pathfinding query.
    let bestDistance = Number.POSITIVE_INFINITY

    timesForEachN([COLUMN_COUNT, ROW_COUNT], (col, row) => {
      const tile = this.getTile($v(col, row))

      if (
        tile === PELLET_MARKER ||
        tile === POWER_PELLET_MARKER ||
        tile === CHERRY_MARKER
      ) {
        const distance = position.manhattanDist(col, row)

        if (distance < bestDistance) bestDistance = distance
      }
    })

    return bestDistance
  }

  private getClosestFrightenedGhostDistance(position: Vector3d): number {
    let bestDistance = Number.POSITIVE_INFINITY

    this.ghosts.forEach(ghost => {
      // Eaten ghosts and ghosts already eaten this power mode are not chase
      // targets; only currently edible ghosts count as frightened.
      if (
        ghost.isEaten ||
        ghost.lastEatenPowerModeId === this.currentPowerModeId
      )
        return

      const distance = position.manhattanDist(ghost.positionInTiles())

      if (distance < bestDistance) bestDistance = distance
    })

    return bestDistance
  }

  private chooseDemoPacmanDirection(): DirectionName {
    // Keep Pacman moving forward when possible; reversing is only a fallback
    // when the current corridor has no other legal exit.
    const candidates = (Object.keys(DIRECTIONS) as DirectionName[]).filter(
      dir => {
        if (
          [DIRECTION_MAP.none, OPPOSITE_DIRECTIONS[this.pacman.dir]].includes(
            dir,
          )
        )
          return false

        return canMove(this.pacman.position, dir)
      },
    )

    const directions =
      candidates.length > 0
        ? candidates
        : // Fallback to reversing if Pacman is trapped in a dead end. This is rare but
          // possible in the demo maze, and it prevents Pacman from getting stuck.
          (Object.keys(DIRECTIONS) as DirectionName[]).filter(
            dir =>
              dir !== DIRECTION_MAP.none && canMove(this.pacman.position, dir),
          )

    if (directions.length === 0) return DIRECTION_MAP.none

    // Score each exit by how quickly it leads to food, while making power
    // pellets especially attractive and nearby ghosts increasingly costly.
    const scoredDirections = directions
      .map(dir => {
        const next = nextCell(this.pacman.position, dir)
        const nextTile = this.getTile(next)

        // While a power pellet is active, hunting an edible ghost outweighs
        // collecting pellets, so it overrides the collectible distance for as
        // long as a frightened ghost remains.
        const primaryDistance = this.inPowerMode()
          ? this.getClosestFrightenedGhostDistance(next)
          : // This is a Manhattan distance to the nearest remaining pellet,
            // power pellet, or cherry after taking this step. Because the final
            // score is minimized, a shorter route produces a better score.
            this.getClosestCollectibleDistance(next)

        // A collectible directly in the candidate tile should outweigh the
        // distance heuristic. Power pellets receive the larger discount
        // because they also let Pacman safely eat frightened ghosts.
        const collectibleBonus = this.inPowerMode()
          ? 0
          : nextTile === POWER_PELLET_MARKER
            ? -50
            : nextTile === PELLET_MARKER
              ? -25
              : 0

        // Threat is the sum of inverse (Manhattan) distances to every ghost. A nearby
        // ghost contributes much more than a distant one; while power mode is active,
        // ghosts are edible, so this danger term is disabled.
        const ghostThreat = this.inPowerMode()
          ? 0
          : this.ghosts.reduce((threat, ghost) => {
              const ghostPos = ghost.positionInTiles()
              const distance = next.manhattanDist(ghostPos)

              return threat + 1 / (distance + 0.4)
            }, 0)

        // These tiny deterministic variations prevent equal-scoring exits
        // from always resolving in the same direction without changing the
        // meaningful food-versus-danger tradeoff.
        const tieBreaker =
          ((dir.charCodeAt(0) + floor(millis() / 220)) % 7) * 0.001

        // Add bounded randomness so the demo does not trace an identical
        // route every time it restarts. Its maximum contribution is small
        // compared with the pellet and threat terms.
        const randomJitter = random() * 0.6

        // Lower is better: prioritize nearby food, apply the direct-tile
        // bonus, and avoid dangerous exits unless power mode is active.
        const score =
          primaryDistance +
          ghostThreat * 7 +
          collectibleBonus +
          tieBreaker +
          randomJitter

        return { dir, score }
      })
      .sort((a, b) => a.score - b.score)

    // Usually take the best route, but occasionally choose a near-best route
    // so demo mode explores the maze instead of repeating one fixed path.
    const alternateRouteChance = this.inPowerMode() ? 0.3 : 0.18

    if (scoredDirections.length > 1 && random() < alternateRouteChance) {
      const furthestIndex = min(
        scoredDirections.length - 1,
        this.inPowerMode() ? 2 : 1,
      )
      const alternateIndex = 1 + floor(random() * furthestIndex)

      return scoredDirections[alternateIndex].dir
    }

    return scoredDirections[0].dir
  }

  private consumePacmanTile(isDemoMode = false) {
    // Demo mode mutates the maze and advances phases but suppresses player-only
    // scoring and audio, allowing the attract loop to run indefinitely.
    const tile = this.getTile(this.pacman.position)

    switch (tile) {
      case PELLET_MARKER:
        this.setTile(this.pacman.position, EMPTY_MARKER)
        this.pelletsRemaining--

        if (!isDemoMode) {
          this.addScore(10)
          playWaka()
        }
        break

      case POWER_PELLET_MARKER:
        this.setTile(this.pacman.position, EMPTY_MARKER)
        this.pelletsRemaining--

        if (!isDemoMode) this.addScore(50)

        this.currentPowerModeId++
        this.powerModeRemainingMs = this.getPowerModeDurationMs()
        this.ghostCombo = 0
        this.syncGhostSpeedsForPowerMode()

        if (!isDemoMode)
          startPowerSirenLoop(
            () => this.powerModeRemainingMs,
            () => this.gameState === 'playing',
          )
        break

      case CHERRY_MARKER:
        this.setTile(this.pacman.position, EMPTY_MARKER)
        this.hideCherry()
        this.cherryVisibleRemainingMs = 0
        this.cherryRespawnRemainingMs = this.randomCherryRespawnDelayMs()

        if (!isDemoMode) {
          this.addScore(CHERRY_SCORE + CHERRY_EXTRA_SCORE)
          playCherryPickup()
        }
        break
    }

    if (this.pelletsRemaining <= 0) {
      this.phase++

      if (!isDemoMode) stopPowerSirenLoop()

      this.resetMazeFromTemplate()
      this.resetRound()
    }
  }

  private checkGhostCollisions(isDemoMode = false) {
    // Collision handling is ordered from edible ghosts to lethal ghosts, with
    // demo mode resetting the round instead of consuming a player life.
    const pacmanPos = this.pacman.positionInTiles()

    this.ghosts.forEach(ghost => {
      if (ghost.isEaten) return

      const ghostPos = ghost.positionInTiles()
      const distance = ghostPos.dist(pacmanPos)

      if (distance > COLLISION_DISTANCE_TILES) return

      if (this.isGhostFrightened(ghost)) {
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

      this.pacman.move(deltaSeconds, () => this.chooseDemoPacmanDirection())

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
    // sharing movement, pellet consumption, and collision behavior with demo.
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
    text2d(
      `High Score: ${this.highScore} (phase ${this.highScorePhase})`,
      toWorldPoint(20, 108),
      '#f4f4f4',
      {
        fontSize: 18,
        fontFamily: 'monospace',
        fontWeight: 'bold',
        textAlign: 'left',
        textBaseline: 'middle',
      },
    )
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

    text2d('GAME OVER', toWorldPoint(animation.width / 2, 70), '#ffffff', {
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
