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
import {
  abs,
  floor,
  HALF_PI,
  max,
  min,
  PI,
  random,
  sin,
} from '../math_utils.ts'
import { $v, Vector3d } from '../vector_3d.ts'
import {
  line,
  isolateTransformations,
  translate,
  rect2d,
  circle2d,
  triangle2d,
  text2d,
  render3dScene,
} from '../primitives.ts'
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

type GameState = 'playing' | 'won' | 'gameOver'

const TILE_SIZE = 24
const PACMAN_RADIUS_RATIO = 0.5
const GHOST_RADIUS_RATIO = 0.44
const BASE_PACMAN_SPEED = 4
const BASE_GHOST_SPEED = 3
const GHOST_SPEED_INCREASE_PER_PHASE = 0.12
const POWER_MODE_GHOST_SPEED_FACTOR = 0.72
const POWER_MODE_MS = 7000
const POWER_MODE_MS_DECREASE_PER_PHASE = 350
const MIN_POWER_MODE_MS = 2800
const POWER_WARNING_FLASH_MS = 1800
const POWER_WARNING_FLASH_INTERVAL_MS = 140
const CHERRY_SCORE = 200
const CHERRY_EXTRA_SCORE = 150
const CHERRY_VISIBLE_MS = 7000
const CHERRY_RESPAWN_MIN_MS = 9000
const CHERRY_RESPAWN_MAX_MS = 18000
const CHERRY_RESPAWN_DECREASE_PER_PHASE = 450
const MIN_CHERRY_RESPAWN_MIN_MS = 2500
const MIN_CHERRY_RESPAWN_MAX_MS = 5000
const GHOST_EATEN_BASE_SCORE = 200
const COLLISION_DISTANCE_TILES = 0.5
const ROUND_START_DELAY_MS = 900
const HIGH_SCORE_STORAGE_KEY = 'demo22_pacman_high_score'

const WALL_MARKER = '◻'
const EMPTY_MARKER = ' '
const PELLET_MARKER = '·'
const POWER_PELLET_MARKER = '⏺'
const CHERRY_MARKER = 'c' // 🍒

// `P` is reserved for Pac-Man only. Pinky uses `H` to avoid marker ambiguity.
const PACMAN_MARKER = 'P'
const BLINKY_MARKER = 'B'
const PINKY_MARKER = 'H'
const INKY_MARKER = 'I'
const CLYDE_MARKER = 'C'

const BLINKY_NAME = 'Blinky'
const PINKY_NAME = 'Pinky'
const INKY_NAME = 'Inky'
const CLYDE_NAME = 'Clyde'

type GhostMarker =
  | typeof BLINKY_MARKER
  | typeof PINKY_MARKER
  | typeof INKY_MARKER
  | typeof CLYDE_MARKER
type GhostName =
  | typeof BLINKY_NAME
  | typeof PINKY_NAME
  | typeof INKY_NAME
  | typeof CLYDE_NAME

// [/doc_img/main.ts/2026-08-08-12-04-06.png]
const GHOST_MARKER_SPECS: {
  marker: GhostMarker
  name: GhostName
  color: string
}[] = [
  { marker: BLINKY_MARKER, name: BLINKY_NAME, color: '#FF0000' },
  { marker: PINKY_MARKER, name: PINKY_NAME, color: '#FFB8DE' },
  { marker: INKY_MARKER, name: INKY_NAME, color: '#46BFEE' },
  { marker: CLYDE_MARKER, name: CLYDE_NAME, color: '#FFB847' },
]

const PINKY_LOOKAHEAD_TILES = 4
const INKY_LOOKAHEAD_TILES = 2
const CLYDE_SHY_DISTANCE_TILES = 8

type Tile =
  | typeof WALL_MARKER
  | typeof EMPTY_MARKER
  | typeof PELLET_MARKER
  | typeof POWER_PELLET_MARKER
  | typeof CHERRY_MARKER
  | typeof PACMAN_MARKER
  | GhostMarker

const DIRECTIONS: Record<DirectionName, Vector3d> = {
  up: $v(0, -1),
  down: $v(0, 1),
  left: $v(-1, 0),
  right: $v(1, 0),
  none: $v(0, 0),
}

const OPPOSITE_DIRECTIONS: Record<DirectionName, DirectionName> = {
  up: 'down',
  down: 'up',
  left: 'right',
  right: 'left',
  none: 'none',
}

// [/doc_img/main.ts/2026-08-10-09-50-36.png]
const MAZE_TEMPLATE = [
  '◻◻◻◻◻◻◻◻◻◻◻◻◻◻◻◻◻◻◻',
  '◻········◻········◻',
  '◻·◻◻·◻◻◻·◻·◻◻◻·◻◻·◻',
  '◻⏺◻◻·◻◻◻·◻·◻◻◻·◻◻⏺◻',
  '◻·················◻',
  '◻·◻◻·◻·◻◻◻◻◻·◻·◻◻·◻',
  '◻····◻···◻···◻····◻',
  '◻◻◻◻·◻◻◻ ◻ ◻◻◻·◻◻◻◻',
  '   ◻·◻       ◻·◻   ',
  '◻◻◻◻·◻ ◻◻B◻◻ ◻·◻◻◻◻',
  '    ·  ◻IHC◻  ·    ',
  '◻◻◻◻·◻ ◻◻◻◻◻ ◻·◻◻◻◻',
  '   ◻·◻   c   ◻·◻   ',
  '◻◻◻◻·◻ ◻◻◻◻◻ ◻·◻◻◻◻',
  '◻········◻········◻',
  '◻·◻◻·◻◻◻·◻·◻◻◻·◻◻·◻',
  '◻⏺·◻·····P·····◻·⏺◻',
  '◻◻·◻·◻·◻◻◻◻◻·◻·◻·◻◻',
  '◻····◻···◻···◻····◻',
  '◻·◻◻◻◻◻◻·◻·◻◻◻◻◻◻·◻',
  '◻·················◻',
  '◻◻◻◻◻◻◻◻◻◻◻◻◻◻◻◻◻◻◻',
] as const

const ROW_COUNT = MAZE_TEMPLATE.length
const COLUMN_COUNT = MAZE_TEMPLATE[0].length

MAZE_TEMPLATE.forEach((row, index) => {
  if (row.length !== COLUMN_COUNT)
    throw new Error(`Invalid maze width at row ${index}`)
})

// renders a power pellet with a pulsing effect.
function renderPowerPellet(pixel: { x: number; y: number }) {
  const pulse = 0.75 + 0.25 * sin(millis() / 120)

  renderCirclePixel(
    pixel.x + TILE_SIZE / 2,
    pixel.y + TILE_SIZE / 2,
    TILE_SIZE * 0.26 * pulse,
    { color: '#fff2df' },
  )
}

function renderPellet(pixel: { x: number; y: number }) {
  renderCirclePixel(
    pixel.x + TILE_SIZE / 2,
    pixel.y + TILE_SIZE / 2,
    TILE_SIZE * 0.12,
    { color: '#ffd7a8' },
  )
}

function renderWall(pixel: { x: number; y: number }) {
  renderFilledRectPixel(pixel.x, pixel.y, TILE_SIZE, TILE_SIZE, '#001243')
  renderStrokeRectPixel(pixel.x, pixel.y, TILE_SIZE, TILE_SIZE, '#2f7bff')
}

// renders a cherry with a stem and two leaves.
function renderCherry(pixel: { x: number; y: number }) {
  const centerX = pixel.x + TILE_SIZE / 2
  const centerY = pixel.y + TILE_SIZE / 2
  const cherryRadius = TILE_SIZE * 0.18

  renderLinePixel(
    centerX - cherryRadius * 0.45,
    centerY - cherryRadius * 1.45,
    centerX,
    centerY - cherryRadius * 2.25,
    '#66b15b',
    2,
  )
  renderLinePixel(
    centerX,
    centerY - cherryRadius * 2.25,
    centerX + cherryRadius * 0.55,
    centerY - cherryRadius * 1.45,
    '#66b15b',
    2,
  )

  renderCirclePixel(
    centerX - cherryRadius * 0.65,
    centerY + cherryRadius * 0.25,
    cherryRadius,
    { color: '#d3152f' },
  )
  renderCirclePixel(
    centerX + cherryRadius * 0.65,
    centerY + cherryRadius * 0.25,
    cherryRadius,
    { color: '#d3152f' },
  )

  renderCirclePixel(
    centerX - cherryRadius,
    centerY - cherryRadius * 0.1,
    cherryRadius * 0.35,
    { color: 'rgba(255, 255, 255, 0.55)' },
  )
  renderCirclePixel(
    centerX + cherryRadius * 0.3,
    centerY - cherryRadius * 0.1,
    cherryRadius * 0.35,
    { color: 'rgba(255, 255, 255, 0.55)' },
  )
}

function getClydeScatterTarget(): Vector3d {
  return $v(1, ROW_COUNT - 2)
}

function getGhostHouseCenterTarget(): Vector3d {
  return $v(
    ghostStarts.find(ghost => {
      return ghost.name === 'Pinky'
    })?.position.x ??
      floor(
        ghostStarts.reduce((sum, ghost) => {
          return sum + ghost.position.x
        }, 0) / ghostStarts.length,
      ),
    ghostStarts.find(ghost => {
      return ghost.name === 'Pinky'
    })?.position.y ??
      floor(
        ghostStarts.reduce((sum, ghost) => {
          return sum + ghost.position.y
        }, 0) / ghostStarts.length,
      ),
  )
}

const maze: Tile[][] = MAZE_TEMPLATE.map(line => {
  return line.split('') as Tile[]
})

function findAndClearMarker(marker: Tile): Vector3d {
  for (let row = 0; row < ROW_COUNT; row++) {
    for (let col = 0; col < COLUMN_COUNT; col++) {
      if (maze[row][col] === marker) {
        maze[row][col] = EMPTY_MARKER

        return $v(col, row)
      }
    }
  }

  throw new Error(`Marker not found: ${marker}`)
}

function findAndClearGhostMarkers(): {
  position: Vector3d
  marker: GhostMarker
  name: GhostName
  color: string
}[] {
  return GHOST_MARKER_SPECS.map(spec => {
    const position = findAndClearMarker(spec.marker)

    return {
      ...spec,
      position,
    }
  })
}

const pacmanStart = findAndClearMarker(PACMAN_MARKER)
const ghostStarts = findAndClearGhostMarkers()
const cherrySpawnPosition = findAndClearMarker(CHERRY_MARKER)

const actorEnvironment: ActorEnvironment = {
  directions: DIRECTIONS,
  isWall,
  wrapCol,
}

const pacman = new Pacman(pacmanStart, BASE_PACMAN_SPEED, actorEnvironment, {
  tileToPixel,
  renderCirclePixel,
  toWorldPoint,
  triangle2d: (pointA, pointB, pointC, options) =>
    triangle2d(pointA, pointB, pointC, options),
  directionToAngle,
  millis,
  tileSize: TILE_SIZE,
  radiusRatio: PACMAN_RADIUS_RATIO,
  roundDelayRemainingMs: () => roundDelayRemainingMs,
})

const ghosts: Ghost[] = ghostStarts.map((start, index) => {
  return new Ghost(
    start.position,
    BASE_GHOST_SPEED,
    index % 2 === 0 ? 'left' : 'right',
    index,
    start.name,
    start.marker,
    start.color,
    actorEnvironment,
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
      getPowerModeRemainingMs: () => powerModeRemainingMs,
      getCurrentPowerModeId: () => currentPowerModeId,
      getGhostHouseCenterTarget,
      getGhosts: () => ghosts,
    },
  )
})

let lastTickMillis: number | null = null
let score = 0
let highScore = 0
let lives = 3
let gameState: GameState = 'gameOver'
let pelletsRemaining = countRemainingPellets()
let powerModeRemainingMs = 0
let ghostCombo = 0
let roundDelayRemainingMs = 0
let currentPowerModeId = 0
let hasStartedGame = false
let phase = 1

function getTile(position: Vector3d): Tile {
  return maze[position.y][position.x] ?? WALL_MARKER
}

function setTile(position: Vector3d, value: Tile): void {
  maze[position.y][position.x] = value
}

function resetMazeFromTemplate() {
  timesForEachN([COLUMN_COUNT, ROW_COUNT], (col, row) => {
    maze[row][col] = MAZE_TEMPLATE[row][col] as Tile
  })

  findAndClearMarker(PACMAN_MARKER)
  findAndClearGhostMarkers()

  findAndClearMarker(CHERRY_MARKER)
  resetCherryCycle()

  pelletsRemaining = countRemainingPellets()
}

function randomCherryRespawnDelayMs() {
  return (
    getCherryRespawnBounds().min +
    random() * (getCherryRespawnBounds().max - getCherryRespawnBounds().min)
  )
}

let cherryVisibleRemainingMs = 0
let cherryRespawnRemainingMs = randomCherryRespawnDelayMs()

function hideCherry() {
  if (getTile(cherrySpawnPosition) === CHERRY_MARKER)
    setTile(cherrySpawnPosition, EMPTY_MARKER)
}

function showCherry() {
  setTile(cherrySpawnPosition, CHERRY_MARKER)
}

function resetCherryCycle() {
  hideCherry()

  cherryVisibleRemainingMs = 0
  cherryRespawnRemainingMs = randomCherryRespawnDelayMs()
}

function updateCherryCycle(deltaSeconds: number) {
  if (!cherrySpawnPosition) return

  const deltaMs = deltaSeconds * 1000

  if (cherryVisibleRemainingMs > 0) {
    cherryVisibleRemainingMs = max(0, cherryVisibleRemainingMs - deltaMs)

    if (cherryVisibleRemainingMs <= 0) {
      hideCherry()
      cherryRespawnRemainingMs = randomCherryRespawnDelayMs()
    }

    return
  }

  cherryRespawnRemainingMs = max(0, cherryRespawnRemainingMs - deltaMs)

  if (cherryRespawnRemainingMs <= 0) {
    showCherry()
    cherryVisibleRemainingMs = CHERRY_VISIBLE_MS
  }
}

function isWall(position: Vector3d): boolean {
  return getTile(position) === WALL_MARKER
}

function wrapCol(col: number): number {
  if (col < 0) return COLUMN_COUNT - 1
  if (col >= COLUMN_COUNT) return 0

  return col
}

function countRemainingPellets(): number {
  let count = 0

  timesForEachN([COLUMN_COUNT, ROW_COUNT], (col, row) => {
    const tile = getTile($v(col, row))

    if (tile === PELLET_MARKER || tile === POWER_PELLET_MARKER) count++
  })

  return count
}

function getGhostSpeed() {
  return BASE_GHOST_SPEED + (phase - 1) * GHOST_SPEED_INCREASE_PER_PHASE
}

function getPowerModeDurationMs() {
  return max(
    MIN_POWER_MODE_MS,
    POWER_MODE_MS - (phase - 1) * POWER_MODE_MS_DECREASE_PER_PHASE,
  )
}

function getCherryRespawnBounds() {
  return {
    min: max(
      MIN_CHERRY_RESPAWN_MIN_MS,
      CHERRY_RESPAWN_MIN_MS - (phase - 1) * CHERRY_RESPAWN_DECREASE_PER_PHASE,
    ),
    max: max(
      MIN_CHERRY_RESPAWN_MAX_MS,
      CHERRY_RESPAWN_MAX_MS - (phase - 1) * CHERRY_RESPAWN_DECREASE_PER_PHASE,
    ),
  }
}

function syncGhostSpeedsForPowerMode() {
  const baseGhostSpeed = getGhostSpeed()
  const ghostSpeed =
    powerModeRemainingMs > 0
      ? baseGhostSpeed * POWER_MODE_GHOST_SPEED_FACTOR
      : baseGhostSpeed

  ghosts.forEach(ghost => {
    if (ghost.isEaten) return

    ghost.speedTilesPerSecond = ghostSpeed
  })
}

function loadHighScore(): number {
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

function saveHighScore(value: number) {
  try {
    self.localStorage.setItem(HIGH_SCORE_STORAGE_KEY, String(value))
  } catch {
    // Ignore storage write failures to keep gameplay uninterrupted.
  }
}

function addScore(points: number) {
  score += points

  if (score > highScore) {
    highScore = score
    saveHighScore(highScore)
  }
}

highScore = loadHighScore()

function resetRound() {
  pacman.reset('left')

  ghosts.forEach((ghost, index) => {
    ghost.reset(index % 2 === 0 ? 'left' : 'right')
    ghost.speedTilesPerSecond = getGhostSpeed()
    ghost.isEaten = false
  })

  powerModeRemainingMs = 0
  stopPowerSirenLoop()
  ghostCombo = 0
  roundDelayRemainingMs = ROUND_START_DELAY_MS
  syncGhostSpeedsForPowerMode()
  resetCherryCycle()
}

function getPacmanFacing(): DirectionName {
  return pacman.dir !== 'none' ? pacman.dir : pacman.nextDir
}

function chooseGhostDirection(ghost: Ghost): DirectionName {
  if (ghost.isEaten) {
    const target = getGhostHouseCenterTarget()

    if (ghost.tryReviveAt(target, 'left', getGhostSpeed())) return 'none'

    return ghost.nextDirectionToTarget(target)
  }

  const candidates = (Object.keys(DIRECTIONS) as DirectionName[]).filter(
    dir => {
      if (dir === 'none') return false
      if (!canMove(ghost.position, dir, actorEnvironment)) return false

      return dir !== OPPOSITE_DIRECTIONS[ghost.dir]
    },
  )

  const directions =
    candidates.length > 0
      ? candidates
      : (Object.keys(DIRECTIONS) as DirectionName[]).filter(dir => {
          return (
            dir !== 'none' && canMove(ghost.position, dir, actorEnvironment)
          )
        })

  if (directions.length === 0) return 'none'

  if (powerModeRemainingMs > 0) {
    const powerRatio = max(
      0,
      min(1, powerModeRemainingMs / getPowerModeDurationMs()),
    )
    const fleeWeight = 0.55 + powerRatio * 1.25
    const spacingWeight = 0.05 + powerRatio * 0.17
    const uncertaintyWeight = (1 - powerRatio) * 1.1
    const pacmanPos = pacman.positionInTiles()
    let fleeDirection = directions[0]
    let bestFleeScore = Number.NEGATIVE_INFINITY

    directions.forEach(dir => {
      const target = nextCell(ghost.position, dir, actorEnvironment)
      const deltaToPacman = target.clone().sub(pacmanPos)
      const fleeDistance = abs(deltaToPacman.y) + abs(deltaToPacman.x)

      // Slightly spread frightened ghosts so they don't bunch up while fleeing.
      const spacingBonus = ghosts
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

  const overlappingGhosts = ghosts.filter(other => {
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

  const pacmanPos = pacman.positionInTiles()
  const chaseTarget = ghost.getChaseTarget(
    pacmanPos,
    DIRECTIONS[getPacmanFacing()],
    ghosts,
    PINKY_LOOKAHEAD_TILES,
    INKY_LOOKAHEAD_TILES,
    CLYDE_SHY_DISTANCE_TILES,
    getClydeScatterTarget,
  )

  let bestDirection = directions[0]
  let bestScore = Number.POSITIVE_INFINITY

  directions.forEach(dir => {
    const target = nextCell(ghost.position, dir, actorEnvironment)
    const deltaToChaseTarget = target.clone().sub(chaseTarget)
    const chaseDistance = abs(deltaToChaseTarget.y) + abs(deltaToChaseTarget.x)

    // Penalize candidate directions that keep ghosts clustered.
    const crowdPenalty = ghosts
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

function getClosestCollectibleDistance(position: Vector3d): number {
  let bestDistance = Number.POSITIVE_INFINITY

  timesForEachN([COLUMN_COUNT, ROW_COUNT], (targetCol, targetRow) => {
    const tile = getTile($v(targetCol, targetRow))

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

function chooseDemoPacmanDirection(): DirectionName {
  const candidates = (Object.keys(DIRECTIONS) as DirectionName[]).filter(
    dir => {
      if (dir === 'none') return false
      if (!canMove(pacman.position, dir, actorEnvironment)) return false

      return dir !== OPPOSITE_DIRECTIONS[pacman.dir]
    },
  )

  const directions =
    candidates.length > 0
      ? candidates
      : (Object.keys(DIRECTIONS) as DirectionName[]).filter(dir => {
          return (
            dir !== 'none' && canMove(pacman.position, dir, actorEnvironment)
          )
        })

  if (directions.length === 0) return 'none'

  const scoredDirections = directions
    .map(dir => {
      const next = nextCell(pacman.position, dir, actorEnvironment)
      const nextTile = getTile(next)
      const collectibleDistance = getClosestCollectibleDistance(next)
      const collectibleBonus =
        nextTile === POWER_PELLET_MARKER
          ? -50
          : nextTile === PELLET_MARKER
            ? -25
            : 0
      const ghostThreat = ghosts.reduce((threat, ghost) => {
        const ghostPos = ghost.positionInTiles()
        const distance = abs(next.y - ghostPos.y) + abs(next.x - ghostPos.x)

        if (powerModeRemainingMs > 0) return threat

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

  // In demo mode, occasionally take an alternate good route so the attract loop varies.
  const alternateRouteChance = powerModeRemainingMs > 0 ? 0.3 : 0.18

  if (scoredDirections.length > 1 && random() < alternateRouteChance) {
    const furthestIndex = min(
      scoredDirections.length - 1,
      powerModeRemainingMs > 0 ? 2 : 1,
    )
    const alternateIndex = 1 + floor(random() * furthestIndex)

    return scoredDirections[alternateIndex].dir
  }

  return scoredDirections[0].dir
}

function consumePacmanTile(isDemoMode = false) {
  const tile = getTile(pacman.position)

  if (tile === PELLET_MARKER) {
    setTile(pacman.position, EMPTY_MARKER)
    pelletsRemaining--
    if (!isDemoMode) addScore(10)
    if (!isDemoMode) playWaka()
  } else if (tile === POWER_PELLET_MARKER) {
    setTile(pacman.position, EMPTY_MARKER)
    pelletsRemaining--
    if (!isDemoMode) addScore(50)
    currentPowerModeId++
    powerModeRemainingMs = getPowerModeDurationMs()
    ghostCombo = 0
    syncGhostSpeedsForPowerMode()
    if (!isDemoMode)
      startPowerSirenLoop(
        () => {
          return powerModeRemainingMs
        },
        () => {
          return gameState === 'playing'
        },
      )
  } else if (tile === CHERRY_MARKER) {
    setTile(pacman.position, EMPTY_MARKER)
    hideCherry()
    cherryVisibleRemainingMs = 0
    cherryRespawnRemainingMs = randomCherryRespawnDelayMs()
    if (!isDemoMode) addScore(CHERRY_SCORE + CHERRY_EXTRA_SCORE)
    if (!isDemoMode) playCherryPickup()
  }

  if (pelletsRemaining <= 0) {
    if (isDemoMode) {
      resetMazeFromTemplate()
      resetRound()
    } else {
      phase++
      stopPowerSirenLoop()
      resetMazeFromTemplate()
      resetRound()
    }
  }
}

function checkGhostCollisions(isDemoMode = false) {
  const pacmanPos = pacman.positionInTiles()

  ghosts.forEach(ghost => {
    if (ghost.isEaten) return

    const ghostPos = ghost.positionInTiles()
    const distance = ghostPos.dist(pacmanPos)

    if (distance > COLLISION_DISTANCE_TILES) return

    if (powerModeRemainingMs > 0) {
      if (ghost.lastEatenPowerModeId === currentPowerModeId) return

      ghost.lastEatenPowerModeId = currentPowerModeId
      ghost.markEaten(getGhostSpeed())
      if (!isDemoMode) addScore(GHOST_EATEN_BASE_SCORE * 2 ** ghostCombo)
      ghostCombo++
      if (!isDemoMode) playGhostEaten()

      return
    }

    if (isDemoMode) {
      resetRound()

      return
    }

    lives--

    if (lives <= 0) {
      gameState = 'gameOver'
      stopPowerSirenLoop()
      playDeath()

      return
    }

    resetRound()
  })
}

function updateGame(deltaSeconds: number) {
  if (gameState !== 'playing') {
    if (roundDelayRemainingMs > 0) {
      roundDelayRemainingMs -= deltaSeconds * 1000

      return
    }

    const hadPowerMode = powerModeRemainingMs > 0

    powerModeRemainingMs = max(0, powerModeRemainingMs - deltaSeconds * 1000)

    if (hadPowerMode && powerModeRemainingMs <= 0) {
      stopPowerSirenLoop()
      syncGhostSpeedsForPowerMode()
    }

    pacman.move(deltaSeconds, chooseDemoPacmanDirection)

    consumePacmanTile(true)

    ghosts.forEach(ghost => {
      ghost.move(deltaSeconds, actor => {
        return chooseGhostDirection(actor as Ghost)
      })
    })

    checkGhostCollisions(true)

    return
  }

  if (roundDelayRemainingMs > 0) {
    roundDelayRemainingMs -= deltaSeconds * 1000

    return
  }

  const hadPowerMode = powerModeRemainingMs > 0

  powerModeRemainingMs = max(0, powerModeRemainingMs - deltaSeconds * 1000)

  if (hadPowerMode && powerModeRemainingMs <= 0) {
    stopPowerSirenLoop()
    syncGhostSpeedsForPowerMode()
  }

  updateCherryCycle(deltaSeconds)

  if (pacman.canMoveTo(pacman.nextDir) && pacman.progress === 0)
    pacman.dir = pacman.nextDir

  pacman.move(deltaSeconds)

  consumePacmanTile()

  ghosts.forEach(ghost => {
    ghost.move(deltaSeconds, actor => {
      return chooseGhostDirection(actor as Ghost)
    })
  })

  checkGhostCollisions()
}

function tileToPixel(tileX: number, tileY: number): { x: number; y: number } {
  const boardWidth = COLUMN_COUNT * TILE_SIZE
  const boardHeight = ROW_COUNT * TILE_SIZE
  const offsetX = (animation.width - boardWidth) / 2
  const offsetY = (animation.height - boardHeight) / 2

  return {
    x: offsetX + tileX * TILE_SIZE,
    y: offsetY + tileY * TILE_SIZE,
  }
}

function toWorldPoint(x: number, y: number) {
  return $v(x - animation.width / 2, animation.height / 2 - y)
}

function renderLinePixel(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: string,
  lineWidth = 1,
) {
  line(toWorldPoint(x1, y1), toWorldPoint(x2, y2), {
    color,
    lineWidth,
    noSplit: true,
  })
}

function renderFilledRectPixel(
  x: number,
  y: number,
  width: number,
  height: number,
  color: string,
  opacity = 1,
) {
  isolateTransformations(() => {
    translate(toWorldPoint(x + width / 2, y + height / 2))

    rect2d(width, height, {
      color,
      noStroke: true,
      opacity,
      isDoubleSided: true,
    })
  })
}

function renderCirclePixel(
  x: number,
  y: number,
  radius: number,
  {
    color,
    strokeColor,
    lineWidth = 1,
    noStroke = true,
    opacity = 1,
  }: {
    color: string
    strokeColor?: string
    lineWidth?: number
    noStroke?: boolean
    opacity?: number
  },
) {
  isolateTransformations(() => {
    translate(toWorldPoint(x, y))

    circle2d(radius, {
      color,
      strokeColor: strokeColor ?? color,
      lineWidth,
      noStroke,
      opacity,
      circleSegments: 28,
      isDoubleSided: true,
    })
  })
}

function renderStrokeRectPixel(
  x: number,
  y: number,
  width: number,
  height: number,
  color: string,
  lineWidth = 1,
) {
  renderLinePixel(x, y, x + width, y, color, lineWidth)
  renderLinePixel(x + width, y, x + width, y + height, color, lineWidth)
  renderLinePixel(x + width, y + height, x, y + height, color, lineWidth)
  renderLinePixel(x, y + height, x, y, color, lineWidth)
}

function renderMaze() {
  timesForEachN([COLUMN_COUNT, ROW_COUNT], (col, row) => {
    const tile = getTile($v(col, row))
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

function directionToAngle(direction: DirectionName): number {
  switch (direction) {
    case 'right':
      return 0
    case 'left':
      return PI
    case 'up':
      return -HALF_PI
    case 'down':
      return HALF_PI
    case 'none':
      return 0
    default: {
      const exhaustiveCheck: never = direction
      return exhaustiveCheck
    }
  }
}

function renderHud() {
  text2d(`Score: ${score}`, toWorldPoint(20, 60), '#f4f4f4', {
    fontSize: 18,
    fontFamily: 'monospace',
    fontWeight: 'bold',
    textAlign: 'left',
    textBaseline: 'middle',
  })
  text2d(`Lives: ${lives}`, toWorldPoint(20, 84), '#f4f4f4', {
    fontSize: 18,
    fontFamily: 'monospace',
    fontWeight: 'bold',
    textAlign: 'left',
    textBaseline: 'middle',
  })
  text2d(`High Score: ${highScore}`, toWorldPoint(20, 108), '#f4f4f4', {
    fontSize: 18,
    fontFamily: 'monospace',
    fontWeight: 'bold',
    textAlign: 'left',
    textBaseline: 'middle',
  })
  text2d(`Phase: ${phase}`, toWorldPoint(20, 132), '#f4f4f4', {
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

function renderStateOverlay() {
  if (!hasStartedGame) {
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

  if (roundDelayRemainingMs > 0 && gameState === 'playing') {
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

  if (gameState === 'playing') return

  renderFilledRectPixel(
    0,
    0,
    animation.width,
    animation.height,
    'rgba(0, 0, 0, 0.6)',
  )

  const message = gameState === 'won' ? 'YOU WIN' : 'GAME OVER'

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

function renderScene() {
  renderMaze()

  pacman.render()
  ghosts.forEach(ghost => {
    ghost.render()
  })

  renderHud()
  renderStateOverlay()
}

function handleKeydown(event: KeyboardEvent) {
  resumeAudio()

  const key = event.key.toLowerCase()

  if (gameState === 'playing') {
    if (key === 'w' || key === 'arrowup') pacman.nextDir = 'up'
    else if (key === 's' || key === 'arrowdown') pacman.nextDir = 'down'
    else if (key === 'a' || key === 'arrowleft') pacman.nextDir = 'left'
    else if (key === 'd' || key === 'arrowright') pacman.nextDir = 'right'
  } else if (key === 'enter') {
    hasStartedGame = true
    score = 0
    lives = 3
    phase = 1
    gameState = 'playing'
    powerModeRemainingMs = 0
    stopPowerSirenLoop()
    ghostCombo = 0

    resetMazeFromTemplate()
    resetRound()
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

function draw() {
  if (frameCount() % FPS_LOGGING_FRAME_PERIOD === 0) console.log({ fps: fps() })

  background('black')

  const now = millis()
  const deltaSeconds =
    lastTickMillis === null ? 1 / FPS : min((now - lastTickMillis) / 1000, 0.05)

  lastTickMillis = now

  updateGame(deltaSeconds)
  renderScene()
}

function onPaused() {
  text2d(
    'PAUSED',
    toWorldPoint(animation.width / 2, animation.height / 2 - 330),
  )
}

const { start, stop } = createFrameLoop(
  () => {
    document.addEventListener('keydown', handleKeydown)
    resetTransformationMatrix()
    draw()
    render3dScene()
  },
  onPaused,
  FPS,
)

export { start, stop }
