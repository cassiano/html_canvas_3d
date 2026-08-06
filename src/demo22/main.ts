import { FPS } from '../constants.ts'
import { createFrameLoop, millis } from '../utils.ts'
import {
  animation,
  background,
  ctx,
  resetTransformationMatrix,
} from '../primitives.ts'
import { TWO_PI, abs, floor, min, sin } from '../math_utils.ts'

type DirectionName = 'up' | 'down' | 'left' | 'right' | 'none'

type DirectionVector = {
  dr: number
  dc: number
}

type Actor = {
  row: number
  col: number
  startRow: number
  startCol: number
  dir: DirectionName
  nextDir: DirectionName
  progress: number
  speedTilesPerSecond: number
}

type Ghost = Actor & {
  color: string
}

type GameState = 'playing' | 'won' | 'gameover'

const TILE_SIZE = 24
const PACMAN_RADIUS_RATIO = 0.5
const GHOST_RADIUS_RATIO = 0.44
const BASE_PACMAN_SPEED = 3
const BASE_GHOST_SPEED = 2
const POWER_MODE_MS = 7000
const COLLISION_DISTANCE_TILES = 0.5
const ROUND_START_DELAY_MS = 900

const DIRECTIONS: Record<DirectionName, DirectionVector> = {
  up: { dr: -1, dc: 0 },
  down: { dr: 1, dc: 0 },
  left: { dr: 0, dc: -1 },
  right: { dr: 0, dc: 1 },
  none: { dr: 0, dc: 0 },
}

const OPPOSITE_DIRECTION: Record<DirectionName, DirectionName> = {
  up: 'down',
  down: 'up',
  left: 'right',
  right: 'left',
  none: 'none',
}

const MAZE_TEMPLATE = [
  '###################',
  '#........#........#',
  '#.###.##.#.##.###.#',
  '#o###.##.#.##.###o#',
  '#.................#',
  '#.###.#.#####.#.###',
  '#.....#...#...#...#',
  '#####.###.#.###.###',
  '#...#.#..GHI..#.#.#',
  '#.#.#.#...#...#.#.#',
  '....#.....P.....#..',
  '#.#.#.###.#.###.#.#',
  '#...#.....J.....#.#',
  '###.#.#.#####.#.#.#',
  '#........#........#',
  '#.###.##.#.##.###.#',
  '#o..#........#..o.#',
  '##.#.#.#####.#.#.##',
  '#....#...#...#....#',
  '#.########.########',
  '###################',
] as const

const ROW_COUNT = MAZE_TEMPLATE.length
const COLUMN_COUNT = MAZE_TEMPLATE[0].length

MAZE_TEMPLATE.forEach((line, row) => {
  if (line.length !== COLUMN_COUNT) {
    throw new Error(`Invalid maze width at row ${row}`)
  }
})

const maze: string[][] = MAZE_TEMPLATE.map(line => line.split(''))

const findAndClearMarker = (marker: string): { row: number; col: number } => {
  for (let row = 0; row < ROW_COUNT; row++) {
    for (let col = 0; col < COLUMN_COUNT; col++) {
      if (maze[row][col] === marker) {
        maze[row][col] = ' '

        return { row, col }
      }
    }
  }

  throw new Error(`Marker not found: ${marker}`)
}

const findAndClearGhostMarkers = (): { row: number; col: number }[] => {
  const markers = ['G', 'H', 'I', 'J']
  const starts: { row: number; col: number }[] = []

  markers.forEach(marker => {
    starts.push(findAndClearMarker(marker))
  })

  return starts
}

const pacmanStart = findAndClearMarker('P')
const ghostStarts = findAndClearGhostMarkers()

const createActor = (
  row: number,
  col: number,
  speedTilesPerSecond: number,
): Actor => ({
  row,
  col,
  startRow: row,
  startCol: col,
  dir: 'left',
  nextDir: 'left',
  progress: 0,
  speedTilesPerSecond,
})

const pacman = createActor(pacmanStart.row, pacmanStart.col, BASE_PACMAN_SPEED)

const ghosts: Ghost[] = ghostStarts.map((start, index) => ({
  ...createActor(start.row, start.col, BASE_GHOST_SPEED),
  dir: index % 2 === 0 ? 'left' : 'right',
  nextDir: index % 2 === 0 ? 'left' : 'right',
  color: ['#ff4d4d', '#ffb84d', '#33d1ff', '#ff70ff'][index],
}))

const getTile = (row: number, col: number): string => maze[row][col] ?? '#'

const setTile = (row: number, col: number, value: string) => {
  maze[row][col] = value
}

const isWall = (row: number, col: number): boolean => getTile(row, col) === '#'

const wrapCol = (col: number): number => {
  if (col < 0) return COLUMN_COUNT - 1
  if (col >= COLUMN_COUNT) return 0

  return col
}

const nextCell = (
  row: number,
  col: number,
  direction: DirectionName,
): { row: number; col: number } => {
  const vector = DIRECTIONS[direction]

  return {
    row: row + vector.dr,
    col: wrapCol(col + vector.dc),
  }
}

const canMove = (
  row: number,
  col: number,
  direction: DirectionName,
): boolean => {
  if (direction === 'none') return false

  const target = nextCell(row, col, direction)

  return !isWall(target.row, target.col)
}

const countRemainingPellets = (): number => {
  let count = 0

  for (let row = 0; row < ROW_COUNT; row++) {
    for (let col = 0; col < COLUMN_COUNT; col++) {
      const tile = getTile(row, col)

      if (tile === '.' || tile === 'o') count++
    }
  }

  return count
}

let lastTickMillis: number | null = null
let score = 0
let lives = 3
let gameState: GameState = 'playing'
let pelletsRemaining = countRemainingPellets()
let powerModeRemainingMs = 0
let ghostCombo = 0
let roundDelayRemainingMs = ROUND_START_DELAY_MS

const resetActor = (actor: Actor) => {
  actor.row = actor.startRow
  actor.col = actor.startCol
  actor.progress = 0
  actor.dir = 'left'
  actor.nextDir = 'left'
}

const resetRound = () => {
  resetActor(pacman)

  ghosts.forEach((ghost, index) => {
    resetActor(ghost)
    ghost.dir = index % 2 === 0 ? 'left' : 'right'
    ghost.nextDir = ghost.dir
  })

  powerModeRemainingMs = 0
  ghostCombo = 0
  roundDelayRemainingMs = ROUND_START_DELAY_MS
}

const resetGhost = (ghost: Ghost) => {
  ghost.row = ghost.startRow
  ghost.col = ghost.startCol
  ghost.progress = 0
  ghost.dir = 'left'
  ghost.nextDir = 'left'
}

const chooseGhostDirection = (ghost: Ghost): DirectionName => {
  const candidates = (Object.keys(DIRECTIONS) as DirectionName[]).filter(
    dir => {
      if (dir === 'none') return false
      if (!canMove(ghost.row, ghost.col, dir)) return false

      return dir !== OPPOSITE_DIRECTION[ghost.dir]
    },
  )

  const directions =
    candidates.length > 0
      ? candidates
      : (Object.keys(DIRECTIONS) as DirectionName[]).filter(
          dir => dir !== 'none' && canMove(ghost.row, ghost.col, dir),
        )

  if (directions.length === 0) return 'none'

  if (powerModeRemainingMs > 0) {
    return directions[floor(Math.random() * directions.length)]
  }

  let bestDirection = directions[0]
  let bestDistance = Number.POSITIVE_INFINITY

  directions.forEach(dir => {
    const target = nextCell(ghost.row, ghost.col, dir)
    const dr = target.row - pacman.row
    const dc = target.col - pacman.col
    const distance = abs(dr) + abs(dc)

    if (distance < bestDistance) {
      bestDistance = distance
      bestDirection = dir
    }
  })

  return bestDirection
}

const moveActor = (
  actor: Actor,
  deltaSeconds: number,
  chooseDirectionAtCenter?: (actor: Actor) => DirectionName,
) => {
  let travel = actor.speedTilesPerSecond * deltaSeconds

  while (travel > 0) {
    if (actor.progress === 0) {
      if (chooseDirectionAtCenter) {
        const selectedDirection = chooseDirectionAtCenter(actor)

        if (selectedDirection !== 'none') actor.nextDir = selectedDirection
      }

      if (canMove(actor.row, actor.col, actor.nextDir)) {
        actor.dir = actor.nextDir
      } else if (!canMove(actor.row, actor.col, actor.dir)) {
        actor.dir = 'none'
      }
    }

    if (actor.dir === 'none') return

    if (!canMove(actor.row, actor.col, actor.dir)) {
      actor.progress = 0
      actor.dir = 'none'

      return
    }

    const remainingToNextTile = 1 - actor.progress
    const step = min(remainingToNextTile, travel)

    actor.progress += step
    travel -= step

    if (actor.progress >= 1) {
      const target = nextCell(actor.row, actor.col, actor.dir)

      actor.row = target.row
      actor.col = target.col
      actor.progress = 0
    }
  }
}

const consumePacmanTile = () => {
  const tile = getTile(pacman.row, pacman.col)

  if (tile === '.') {
    setTile(pacman.row, pacman.col, ' ')
    pelletsRemaining--
    score += 10
  } else if (tile === 'o') {
    setTile(pacman.row, pacman.col, ' ')
    pelletsRemaining--
    score += 50
    powerModeRemainingMs = POWER_MODE_MS
    ghostCombo = 0
  }

  if (pelletsRemaining <= 0) gameState = 'won'
}

const actorPositionInTiles = (actor: Actor): { x: number; y: number } => {
  const vector = DIRECTIONS[actor.dir]

  return {
    x: actor.col + vector.dc * actor.progress,
    y: actor.row + vector.dr * actor.progress,
  }
}

const checkGhostCollisions = () => {
  const pacmanPos = actorPositionInTiles(pacman)

  ghosts.forEach(ghost => {
    const ghostPos = actorPositionInTiles(ghost)
    const dx = ghostPos.x - pacmanPos.x
    const dy = ghostPos.y - pacmanPos.y
    const distance = Math.hypot(dx, dy)

    if (distance > COLLISION_DISTANCE_TILES) return

    if (powerModeRemainingMs > 0) {
      resetGhost(ghost)
      score += 200 * 2 ** ghostCombo
      ghostCombo++

      return
    }

    lives--

    if (lives <= 0) {
      gameState = 'gameover'

      return
    }

    resetRound()
  })
}

const updateGame = (deltaSeconds: number) => {
  if (gameState !== 'playing') return

  if (roundDelayRemainingMs > 0) {
    roundDelayRemainingMs -= deltaSeconds * 1000

    return
  }

  powerModeRemainingMs = Math.max(0, powerModeRemainingMs - deltaSeconds * 1000)

  if (
    canMove(pacman.row, pacman.col, pacman.nextDir) &&
    pacman.progress === 0
  ) {
    pacman.dir = pacman.nextDir
  }

  moveActor(pacman, deltaSeconds)

  consumePacmanTile()

  ghosts.forEach(ghost =>
    moveActor(ghost, deltaSeconds, actor =>
      chooseGhostDirection(actor as Ghost),
    ),
  )

  checkGhostCollisions()
}

const tileToPixel = (
  tileX: number,
  tileY: number,
): { x: number; y: number } => {
  const boardWidth = COLUMN_COUNT * TILE_SIZE
  const boardHeight = ROW_COUNT * TILE_SIZE
  const offsetX = (animation.width - boardWidth) / 2
  const offsetY = (animation.height - boardHeight) / 2

  return {
    x: offsetX + tileX * TILE_SIZE,
    y: offsetY + tileY * TILE_SIZE,
  }
}

const drawMaze = () => {
  for (let row = 0; row < ROW_COUNT; row++) {
    for (let col = 0; col < COLUMN_COUNT; col++) {
      const tile = getTile(row, col)
      const pixel = tileToPixel(col, row)

      if (tile === '#') {
        ctx.fillStyle = '#001243'
        ctx.fillRect(pixel.x, pixel.y, TILE_SIZE, TILE_SIZE)
        ctx.strokeStyle = '#2f7bff'
        ctx.lineWidth = 1
        ctx.strokeRect(
          pixel.x + 0.5,
          pixel.y + 0.5,
          TILE_SIZE - 1,
          TILE_SIZE - 1,
        )
      } else if (tile === '.') {
        ctx.fillStyle = '#ffd7a8'
        ctx.beginPath()
        ctx.arc(
          pixel.x + TILE_SIZE / 2,
          pixel.y + TILE_SIZE / 2,
          TILE_SIZE * 0.12,
          0,
          TWO_PI,
        )
        ctx.fill()
      } else if (tile === 'o') {
        const pulse = 0.75 + 0.25 * sin(millis() / 120)

        ctx.fillStyle = '#fff2df'
        ctx.beginPath()
        ctx.arc(
          pixel.x + TILE_SIZE / 2,
          pixel.y + TILE_SIZE / 2,
          TILE_SIZE * 0.26 * pulse,
          0,
          TWO_PI,
        )
        ctx.fill()
      }
    }
  }
}

const directionToAngle = (direction: DirectionName): number => {
  switch (direction) {
    case 'right':
      return 0
    case 'left':
      return Math.PI
    case 'up':
      return -Math.PI / 2
    case 'down':
      return Math.PI / 2
    default:
      return 0
  }
}

const drawPacman = () => {
  const position = actorPositionInTiles(pacman)
  const pixel = tileToPixel(position.x + 0.5, position.y + 0.5)
  const radius = TILE_SIZE * PACMAN_RADIUS_RATIO
  const moving = pacman.dir !== 'none' && roundDelayRemainingMs <= 0
  const facingDirection = pacman.dir !== 'none' ? pacman.dir : pacman.nextDir
  const chompPhase = abs(sin(millis() / 88))
  const mouth = moving ? 0.1 + 0.28 * chompPhase : 0.04
  const angle = directionToAngle(facingDirection)
  const look = DIRECTIONS[facingDirection]
  const bob = moving ? sin(millis() / 140) * radius * 0.05 : 0
  const squash = moving ? 1 - chompPhase * 0.07 : 1
  const stretch = moving ? 1 + chompPhase * 0.07 : 1

  ctx.save()
  ctx.translate(pixel.x, pixel.y + bob)

  // Grounded contact shadow for extra depth.
  ctx.fillStyle = 'rgba(0, 0, 0, 0.22)'
  ctx.beginPath()
  ctx.ellipse(0, radius * 0.95, radius * 0.8, radius * 0.24, 0, 0, TWO_PI)
  ctx.fill()

  ctx.save()
  ctx.scale(stretch, squash)

  const bodyGradient = ctx.createRadialGradient(
    -radius * 0.42,
    -radius * 0.46,
    radius * 0.18,
    0,
    0,
    radius * 1.05,
  )
  bodyGradient.addColorStop(0, '#fff7b2')
  bodyGradient.addColorStop(0.58, '#ffd847')
  bodyGradient.addColorStop(1, '#eeae00')

  ctx.shadowColor = 'rgba(0, 0, 0, 0.35)'
  ctx.shadowBlur = 9
  ctx.shadowOffsetY = 2

  ctx.fillStyle = bodyGradient
  ctx.beginPath()
  ctx.arc(0, 0, radius, 0, TWO_PI)
  ctx.fill()

  // Carve the mouth from a full disk for a cleaner edge than direct wedge fills.
  ctx.globalCompositeOperation = 'destination-out'
  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.arc(0, 0, radius * 1.1, angle + mouth, angle - mouth, true)
  ctx.closePath()
  ctx.fill()

  ctx.globalCompositeOperation = 'source-over'
  ctx.shadowColor = 'transparent'
  ctx.strokeStyle = '#cf9300'
  ctx.lineWidth = 1.35
  ctx.beginPath()
  ctx.arc(0, 0, radius, 0, TWO_PI)
  ctx.stroke()

  ctx.strokeStyle = 'rgba(64, 34, 0, 0.55)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.arc(0, 0, radius * 0.96, angle + mouth, angle - mouth, true)
  ctx.stroke()

  const eyeX = look.dc * radius * 0.22 - look.dr * radius * 0.24
  const eyeY = look.dr * radius * 0.22 + look.dc * radius * 0.24

  ctx.fillStyle = '#f9fcff'
  ctx.beginPath()
  ctx.arc(eyeX, eyeY, radius * 0.12, 0, TWO_PI)
  ctx.fill()

  ctx.fillStyle = '#16223a'
  ctx.beginPath()
  ctx.arc(
    eyeX + look.dc * radius * 0.03,
    eyeY + look.dr * radius * 0.03,
    radius * 0.065,
    0,
    TWO_PI,
  )
  ctx.fill()

  ctx.fillStyle = 'rgba(255, 255, 255, 0.55)'
  ctx.beginPath()
  ctx.arc(-radius * 0.34, -radius * 0.34, radius * 0.17, 0, TWO_PI)
  ctx.fill()

  ctx.fillStyle = 'rgba(255, 255, 255, 0.32)'
  ctx.beginPath()
  ctx.arc(-radius * 0.08, -radius * 0.5, radius * 0.08, 0, TWO_PI)
  ctx.fill()

  ctx.restore()
  ctx.restore()
}

const drawGhost = (ghost: Ghost) => {
  const position = actorPositionInTiles(ghost)
  const pixel = tileToPixel(position.x + 0.5, position.y + 0.5)
  const radius = TILE_SIZE * GHOST_RADIUS_RATIO
  const left = pixel.x - radius
  const top = pixel.y - radius
  const right = pixel.x + radius
  const bottom = pixel.y + radius
  const eyeOffsetX = radius * 0.35
  const eyeOffsetY = radius * 0.2
  const eyeRadius = radius * 0.22
  const pupilRadius = radius * 0.09
  const lookDirection = DIRECTIONS[ghost.dir]
  const frightened = powerModeRemainingMs > 0

  ctx.fillStyle = frightened ? '#2f6eff' : ghost.color
  ctx.beginPath()
  ctx.moveTo(left, bottom)
  ctx.arc(pixel.x, top + radius, radius, Math.PI, 0)
  ctx.lineTo(right, bottom)

  const waveCount = 4
  const waveWidth = (right - left) / waveCount

  for (let i = waveCount - 1; i >= 0; i--) {
    const x = left + i * waveWidth
    const controlX = x + waveWidth / 2
    const controlY = i % 2 === 0 ? bottom - radius * 0.35 : bottom

    ctx.quadraticCurveTo(controlX, controlY, x, bottom)
  }

  ctx.closePath()
  ctx.fill()

  ctx.fillStyle = 'white'
  ctx.beginPath()
  ctx.arc(pixel.x - eyeOffsetX, pixel.y - eyeOffsetY, eyeRadius, 0, TWO_PI)
  ctx.arc(pixel.x + eyeOffsetX, pixel.y - eyeOffsetY, eyeRadius, 0, TWO_PI)
  ctx.fill()

  ctx.fillStyle = '#111'
  ctx.beginPath()
  ctx.arc(
    pixel.x - eyeOffsetX + lookDirection.dc * eyeRadius * 0.45,
    pixel.y - eyeOffsetY + lookDirection.dr * eyeRadius * 0.45,
    pupilRadius,
    0,
    TWO_PI,
  )
  ctx.arc(
    pixel.x + eyeOffsetX + lookDirection.dc * eyeRadius * 0.45,
    pixel.y - eyeOffsetY + lookDirection.dr * eyeRadius * 0.45,
    pupilRadius,
    0,
    TWO_PI,
  )
  ctx.fill()
}

const drawHud = () => {
  ctx.fillStyle = '#f4f4f4'
  ctx.font = '18px monospace'
  ctx.textAlign = 'left'
  ctx.fillText(`Score: ${score}`, 20, 30)
  ctx.fillText(`Lives: ${lives}`, 20, 54)
  ctx.fillText('Move: Arrow Keys / WASD', 20, animation.height - 24)
}

const drawStateOverlay = () => {
  if (roundDelayRemainingMs > 0 && gameState === 'playing') {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)'
    ctx.fillRect(0, 0, animation.width, animation.height)
    ctx.fillStyle = '#ffde59'
    ctx.font = 'bold 26px monospace'
    ctx.textAlign = 'center'
    ctx.fillText('READY!', animation.width / 2, 70)

    return
  }

  if (gameState === 'playing') return

  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)'
  ctx.fillRect(0, 0, animation.width, animation.height)
  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 36px monospace'
  ctx.textAlign = 'center'

  const message = gameState === 'won' ? 'YOU WIN' : 'GAME OVER'

  ctx.fillText(message, animation.width / 2, animation.height / 2)
  ctx.font = '20px monospace'
  ctx.fillText(
    'Press Enter to restart',
    animation.width / 2,
    animation.height / 2 + 36,
  )
}

const drawScene = () => {
  background('black')
  drawMaze()
  drawPacman()
  ghosts.forEach(drawGhost)
  drawHud()
  drawStateOverlay()
}

const handleKeydown = (event: KeyboardEvent) => {
  const key = event.key.toLowerCase()

  if (key === 'w' || key === 'arrowup') pacman.nextDir = 'up'
  else if (key === 's' || key === 'arrowdown') pacman.nextDir = 'down'
  else if (key === 'a' || key === 'arrowleft') pacman.nextDir = 'left'
  else if (key === 'd' || key === 'arrowright') pacman.nextDir = 'right'
  else if (key === 'enter' && gameState !== 'playing') {
    score = 0
    lives = 3
    gameState = 'playing'
    powerModeRemainingMs = 0
    ghostCombo = 0

    for (let row = 0; row < ROW_COUNT; row++) {
      for (let col = 0; col < COLUMN_COUNT; col++) {
        maze[row][col] = MAZE_TEMPLATE[row][col]
      }
    }

    findAndClearMarker('P')
    findAndClearGhostMarkers()
    pelletsRemaining = countRemainingPellets()
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

const onPaused = () => {
  drawScene()

  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)'
  ctx.fillRect(0, 0, animation.width, animation.height)
  ctx.fillStyle = '#ffffff'
  ctx.textAlign = 'center'
  ctx.font = 'bold 34px monospace'
  ctx.fillText('PAUSED', animation.width / 2, animation.height / 2)
}

const { start: startLoop, stop: stopLoop } = createFrameLoop(
  () => {
    resetTransformationMatrix()

    const now = millis()
    const deltaSeconds =
      lastTickMillis === null
        ? 1 / FPS
        : Math.min((now - lastTickMillis) / 1000, 0.05)

    lastTickMillis = now

    updateGame(deltaSeconds)
    drawScene()
  },
  onPaused,
  60,
)

export const start = () => {
  lastTickMillis = null
  document.addEventListener('keydown', handleKeydown)
  startLoop()
}

export const stop = () => {
  document.removeEventListener('keydown', handleKeydown)
  stopLoop()
  background('black')
}
