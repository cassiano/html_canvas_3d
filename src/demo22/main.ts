import { FPS, FPS_LOGGING_FRAME_PERIOD } from '../constants.ts'
import { createFrameLoop, millis, frameCount, fps } from '../utils.ts'
import {
  animation,
  background,
  resetTransformationMatrix,
} from '../primitives.ts'
import { abs, floor, min, sin } from '../math_utils.ts'
import { $v } from '../vector_3d.ts'
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
  id: number
  color: string
}

type GameState = 'playing' | 'won' | 'gameOver'

const TILE_SIZE = 24
const PACMAN_RADIUS_RATIO = 0.5
const GHOST_RADIUS_RATIO = 0.44
const BASE_PACMAN_SPEED = 3
const BASE_GHOST_SPEED = 2
const POWER_MODE_MS = 7000
const CHERRY_SCORE = 100
const CHERRY_EXTRA_SCORE = 150
const CHERRY_COUNT = 4
const COLLISION_DISTANCE_TILES = 0.5
const ROUND_START_DELAY_MS = 900
const WAKA_INTERVAL_MS = 95
const POWER_SIREN_LOOP_MS = 900
const HIGH_SCORE_STORAGE_KEY = 'demo22_pacman_high_score'

const GHOST_CHASE_OFFSETS = [
  { row: 0, col: 0 },
  { row: -2, col: 2 },
  { row: 2, col: -2 },
  { row: 0, col: -4 },
] as const

let audioContext: AudioContext | null = null
let masterGain: GainNode | null = null
let noiseBuffer: AudioBuffer | null = null
let lastWakaMillis = -Infinity
let wakaHighTone = false
let powerSirenTimer: number | null = null

const ensureAudio = () => {
  if (audioContext && masterGain) return true

  const AudioContextClass = self.AudioContext

  if (!AudioContextClass) return false

  audioContext = new AudioContextClass()
  masterGain = audioContext.createGain()
  masterGain.gain.value = 0.2
  masterGain.connect(audioContext.destination)

  const sampleRate = audioContext.sampleRate
  const bufferSize = sampleRate
  noiseBuffer = audioContext.createBuffer(1, bufferSize, sampleRate)
  const data = noiseBuffer.getChannelData(0)

  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1

  return true
}

const resumeAudio = () => {
  if (!ensureAudio() || !audioContext) return
  if (audioContext.state === 'suspended') audioContext.resume()
}

const playTone = (
  frequency: number,
  duration = 0.08,
  {
    type = 'square',
    gain = 0.25,
  }: {
    type?: OscillatorType
    gain?: number
  } = {},
) => {
  if (!ensureAudio() || !audioContext || !masterGain) return

  const now = audioContext.currentTime
  const oscillator = audioContext.createOscillator()
  const envelope = audioContext.createGain()

  oscillator.type = type
  oscillator.frequency.setValueAtTime(frequency, now)

  envelope.gain.setValueAtTime(0.0001, now)
  envelope.gain.linearRampToValueAtTime(gain, now + 0.01)
  envelope.gain.exponentialRampToValueAtTime(0.0001, now + duration)

  oscillator.connect(envelope)
  envelope.connect(masterGain)
  oscillator.start(now)
  oscillator.stop(now + duration + 0.02)
}

const playSweep = (
  startFrequency: number,
  endFrequency: number,
  duration: number,
  {
    type = 'triangle',
    gain = 0.2,
  }: {
    type?: OscillatorType
    gain?: number
  } = {},
) => {
  if (!ensureAudio() || !audioContext || !masterGain) return

  const now = audioContext.currentTime
  const oscillator = audioContext.createOscillator()
  const envelope = audioContext.createGain()

  oscillator.type = type
  oscillator.frequency.setValueAtTime(startFrequency, now)
  oscillator.frequency.exponentialRampToValueAtTime(
    endFrequency,
    now + duration,
  )

  envelope.gain.setValueAtTime(0.0001, now)
  envelope.gain.linearRampToValueAtTime(gain, now + 0.015)
  envelope.gain.exponentialRampToValueAtTime(0.0001, now + duration)

  oscillator.connect(envelope)
  envelope.connect(masterGain)
  oscillator.start(now)
  oscillator.stop(now + duration + 0.03)
}

const playNoiseBurst = (duration = 0.12, gain = 0.08) => {
  if (!ensureAudio() || !audioContext || !masterGain || !noiseBuffer) return

  const now = audioContext.currentTime
  const source = audioContext.createBufferSource()
  const filter = audioContext.createBiquadFilter()
  const envelope = audioContext.createGain()

  source.buffer = noiseBuffer
  filter.type = 'bandpass'
  filter.frequency.setValueAtTime(1200, now)
  filter.Q.value = 6

  envelope.gain.setValueAtTime(0.0001, now)
  envelope.gain.linearRampToValueAtTime(gain, now + 0.01)
  envelope.gain.exponentialRampToValueAtTime(0.0001, now + duration)

  source.connect(filter)
  filter.connect(envelope)
  envelope.connect(masterGain)
  source.start(now)
  source.stop(now + duration + 0.02)
}

const playWaka = () => {
  const nowMillis = millis()

  if (nowMillis - lastWakaMillis < WAKA_INTERVAL_MS) return

  lastWakaMillis = nowMillis
  wakaHighTone = !wakaHighTone

  playTone(wakaHighTone ? 780 : 620, 0.055, { type: 'square', gain: 0.18 })
}

const playPowerPellet = () => {
  if (!ensureAudio() || !audioContext || !masterGain) return

  const now = audioContext.currentTime
  const duration = 1.08
  const stepDuration = 0.056
  const stepCount = floor(duration / stepDuration)

  const carrier = audioContext.createOscillator()
  const carrierDetuned = audioContext.createOscillator()
  const harmonic = audioContext.createOscillator()
  const subCarrier = audioContext.createOscillator()
  const tremolo = audioContext.createOscillator()
  const tremoloGain = audioContext.createGain()
  const vibrato = audioContext.createOscillator()
  const vibratoGain = audioContext.createGain()
  const postDrive = audioContext.createGain()
  const bandpass = audioContext.createBiquadFilter()
  const lowpass = audioContext.createBiquadFilter()
  const envelope = audioContext.createGain()

  carrier.type = 'sawtooth'
  carrierDetuned.type = 'sawtooth'
  harmonic.type = 'square'
  subCarrier.type = 'triangle'

  carrierDetuned.detune.setValueAtTime(-12, now)

  for (let i = 0; i <= stepCount; i++) {
    const t = now + i * stepDuration
    const risingBias = i * 22
    const tone = i % 2 === 0 ? 660 + risingBias : 1040 + risingBias

    carrier.frequency.setValueAtTime(tone, t)
    carrierDetuned.frequency.setValueAtTime(tone * 0.995, t)
    harmonic.frequency.setValueAtTime(tone * 1.98, t)
    subCarrier.frequency.setValueAtTime(tone * 0.46, t)
  }

  tremolo.type = 'square'
  tremolo.frequency.setValueAtTime(15.5, now)
  tremoloGain.gain.setValueAtTime(0.07, now)

  vibrato.type = 'sine'
  vibrato.frequency.setValueAtTime(9.8, now)
  vibratoGain.gain.setValueAtTime(34, now)

  bandpass.type = 'bandpass'
  bandpass.frequency.setValueAtTime(1600, now)
  bandpass.frequency.linearRampToValueAtTime(2300, now + duration)
  bandpass.Q.value = 5.5

  lowpass.type = 'lowpass'
  lowpass.frequency.setValueAtTime(3200, now)
  lowpass.frequency.linearRampToValueAtTime(1850, now + duration)
  lowpass.Q.value = 1.1

  postDrive.gain.setValueAtTime(1.15, now)

  envelope.gain.setValueAtTime(0.0001, now)
  envelope.gain.linearRampToValueAtTime(0.23, now + 0.012)
  envelope.gain.linearRampToValueAtTime(0.16, now + duration * 0.7)
  envelope.gain.exponentialRampToValueAtTime(0.0001, now + duration)

  tremolo.connect(tremoloGain)
  tremoloGain.connect(envelope.gain)

  vibrato.connect(vibratoGain)
  vibratoGain.connect(carrier.frequency)
  vibratoGain.connect(carrierDetuned.frequency)

  carrier.connect(bandpass)
  carrierDetuned.connect(bandpass)
  harmonic.connect(bandpass)
  subCarrier.connect(bandpass)
  bandpass.connect(lowpass)
  lowpass.connect(postDrive)
  postDrive.connect(envelope)
  envelope.connect(masterGain)

  carrier.start(now)
  carrierDetuned.start(now)
  harmonic.start(now)
  subCarrier.start(now)
  tremolo.start(now)
  vibrato.start(now)

  carrier.stop(now + duration + 0.03)
  carrierDetuned.stop(now + duration + 0.03)
  harmonic.stop(now + duration + 0.03)
  subCarrier.stop(now + duration + 0.03)
  tremolo.stop(now + duration + 0.03)
  vibrato.stop(now + duration + 0.03)

  // Extra attack/transient layers to sell the emergency siren feel.
  playNoiseBurst(0.06, 0.032)
  playNoiseBurst(0.1, 0.024)
  playNoiseBurst(0.14, 0.018)
}

const playCherryPickup = () => {
  if (!ensureAudio() || !audioContext || !masterGain) return

  const now = audioContext.currentTime
  const duration = 0.34

  const lead = audioContext.createOscillator()
  const body = audioContext.createOscillator()
  const sparkle = audioContext.createOscillator()
  const shimmer = audioContext.createOscillator()
  const preGain = audioContext.createGain()
  const filter = audioContext.createBiquadFilter()
  const wetFilter = audioContext.createBiquadFilter()
  const delay = audioContext.createDelay(0.5)
  const feedback = audioContext.createGain()
  const wetGain = audioContext.createGain()
  const envelope = audioContext.createGain()

  lead.type = 'triangle'
  body.type = 'sawtooth'
  sparkle.type = 'sine'
  shimmer.type = 'square'

  body.detune.setValueAtTime(-7, now)
  shimmer.detune.setValueAtTime(4, now)

  lead.frequency.setValueAtTime(720, now)
  lead.frequency.exponentialRampToValueAtTime(1080, now + 0.09)
  lead.frequency.exponentialRampToValueAtTime(1640, now + 0.19)
  lead.frequency.exponentialRampToValueAtTime(1320, now + duration)

  body.frequency.setValueAtTime(360, now)
  body.frequency.exponentialRampToValueAtTime(660, now + 0.11)
  body.frequency.exponentialRampToValueAtTime(520, now + duration)

  sparkle.frequency.setValueAtTime(1440, now)
  sparkle.frequency.exponentialRampToValueAtTime(2280, now + 0.12)
  sparkle.frequency.exponentialRampToValueAtTime(1860, now + duration)

  shimmer.frequency.setValueAtTime(1780, now)
  shimmer.frequency.exponentialRampToValueAtTime(2560, now + 0.13)
  shimmer.frequency.exponentialRampToValueAtTime(1920, now + duration)

  preGain.gain.setValueAtTime(0.8, now)

  filter.type = 'bandpass'
  filter.frequency.setValueAtTime(1750, now)
  filter.frequency.linearRampToValueAtTime(2100, now + duration)
  filter.Q.value = 3.9

  wetFilter.type = 'lowpass'
  wetFilter.frequency.setValueAtTime(2200, now)

  delay.delayTime.setValueAtTime(0.085, now)
  feedback.gain.setValueAtTime(0.28, now)
  wetGain.gain.setValueAtTime(0.26, now)

  envelope.gain.setValueAtTime(0.0001, now)
  envelope.gain.linearRampToValueAtTime(0.2, now + 0.012)
  envelope.gain.linearRampToValueAtTime(0.14, now + 0.16)
  envelope.gain.exponentialRampToValueAtTime(0.0001, now + duration)

  lead.connect(preGain)
  body.connect(preGain)
  sparkle.connect(preGain)
  shimmer.connect(preGain)

  preGain.connect(filter)
  filter.connect(envelope)

  filter.connect(wetFilter)
  wetFilter.connect(delay)
  delay.connect(feedback)
  feedback.connect(delay)
  delay.connect(wetGain)
  wetGain.connect(envelope)

  envelope.connect(masterGain)

  lead.start(now)
  body.start(now)
  sparkle.start(now)
  shimmer.start(now)

  lead.stop(now + duration + 0.03)
  body.stop(now + duration + 0.03)
  sparkle.stop(now + duration + 0.03)
  shimmer.stop(now + duration + 0.03)

  playNoiseBurst(0.05, 0.014)
}

const playGhostEaten = () => {
  playSweep(920, 310, 0.16, { type: 'sawtooth', gain: 0.15 })
  playNoiseBurst(0.1, 0.07)
}

const playDeath = () => {
  playSweep(620, 90, 0.55, { type: 'sawtooth', gain: 0.2 })
  playNoiseBurst(0.24, 0.09)
}

const playWin = () => {
  playTone(660, 0.09, { type: 'triangle', gain: 0.15 })
  playTone(880, 0.09, { type: 'triangle', gain: 0.15 })
  playTone(1320, 0.18, { type: 'triangle', gain: 0.15 })
}

const stopPowerSirenLoop = () => {
  if (powerSirenTimer === null) return

  self.clearInterval(powerSirenTimer)
  powerSirenTimer = null
}

const startPowerSirenLoop = () => {
  if (powerSirenTimer !== null) return

  playPowerPellet()

  powerSirenTimer = self.setInterval(() => {
    if (powerModeRemainingMs > 0 && gameState === 'playing') playPowerPellet()
    else stopPowerSirenLoop()
  }, POWER_SIREN_LOOP_MS)
}

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
  '#..#.#...#...#.#..#',
  '#.................#',
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
  id: index,
  dir: index % 2 === 0 ? 'left' : 'right',
  nextDir: index % 2 === 0 ? 'left' : 'right',
  color: ['#ff4d4d', '#ffb84d', '#33d1ff', '#ff70ff'][index],
}))

const getTile = (row: number, col: number): string => maze[row][col] ?? '#'

const setTile = (row: number, col: number, value: string) => {
  maze[row][col] = value
}

const isStartCell = (row: number, col: number): boolean => {
  if (row === pacmanStart.row && col === pacmanStart.col) return true

  return ghostStarts.some(start => start.row === row && start.col === col)
}

const placeRandomCherries = (count = CHERRY_COUNT) => {
  const candidates: { row: number; col: number }[] = []

  for (let row = 0; row < ROW_COUNT; row++) {
    for (let col = 0; col < COLUMN_COUNT; col++) {
      if (isStartCell(row, col)) continue

      const tile = getTile(row, col)

      if (tile === '.') candidates.push({ row, col })
    }
  }

  let cherriesToPlace = min(count, candidates.length)

  while (cherriesToPlace > 0) {
    const randomIndex = floor(Math.random() * candidates.length)
    const selectedCell = candidates.splice(randomIndex, 1)[0]

    setTile(selectedCell.row, selectedCell.col, 'c')

    cherriesToPlace--
  }
}

placeRandomCherries()

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
let highScore = 0
let lives = 3
let gameState: GameState = 'playing'
let pelletsRemaining = countRemainingPellets()
let powerModeRemainingMs = 0
let ghostCombo = 0
let roundDelayRemainingMs = ROUND_START_DELAY_MS

const loadHighScore = (): number => {
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

const saveHighScore = (value: number) => {
  try {
    self.localStorage.setItem(HIGH_SCORE_STORAGE_KEY, String(value))
  } catch {
    // Ignore storage write failures to keep gameplay uninterrupted.
  }
}

const addScore = (points: number) => {
  score += points

  if (score > highScore) {
    highScore = score
    saveHighScore(highScore)
  }
}

highScore = loadHighScore()

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
  stopPowerSirenLoop()
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
    const powerRatio = Math.max(
      0,
      Math.min(1, powerModeRemainingMs / POWER_MODE_MS),
    )
    const fleeWeight = 0.55 + powerRatio * 1.25
    const spacingWeight = 0.05 + powerRatio * 0.17
    const uncertaintyWeight = (1 - powerRatio) * 1.1
    const pacmanPos = actorPositionInTiles(pacman)
    let fleeDirection = directions[0]
    let bestFleeScore = Number.NEGATIVE_INFINITY

    directions.forEach(dir => {
      const target = nextCell(ghost.row, ghost.col, dir)
      const dr = target.row - pacmanPos.y
      const dc = target.col - pacmanPos.x
      const fleeDistance = abs(dr) + abs(dc)

      // Slightly spread frightened ghosts so they don't bunch up while fleeing.
      const spacingBonus = ghosts
        .filter(other => other.id !== ghost.id)
        .reduce((bonus, other) => {
          const otherPos = actorPositionInTiles(other)
          const dist =
            abs(target.row - otherPos.y) + abs(target.col - otherPos.x)

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

  const overlappingGhosts = ghosts.filter(
    other =>
      other.id !== ghost.id &&
      other.progress === 0 &&
      ghost.progress === 0 &&
      other.row === ghost.row &&
      other.col === ghost.col,
  )

  if (overlappingGhosts.length > 0) {
    const occupiedDirections = new Set(
      overlappingGhosts.map(other =>
        other.nextDir !== 'none' ? other.nextDir : other.dir,
      ),
    )

    const freeDirections = directions.filter(
      dir => !occupiedDirections.has(dir),
    )

    if (freeDirections.length > 0) {
      const rotateIndex =
        (ghost.id + floor(millis() / 120)) % freeDirections.length

      return freeDirections[rotateIndex]
    }

    const rotateIndex = (ghost.id + floor(millis() / 120)) % directions.length

    return directions[rotateIndex]
  }

  const chaseOffset = GHOST_CHASE_OFFSETS[ghost.id % GHOST_CHASE_OFFSETS.length]
  const targetRow = pacman.row + chaseOffset.row
  const targetCol = pacman.col + chaseOffset.col

  let bestDirection = directions[0]
  let bestScore = Number.POSITIVE_INFINITY

  directions.forEach(dir => {
    const target = nextCell(ghost.row, ghost.col, dir)
    const dr = target.row - targetRow
    const dc = target.col - targetCol
    const chaseDistance = abs(dr) + abs(dc)

    // Penalize candidate directions that keep ghosts clustered.
    const crowdPenalty = ghosts
      .filter(other => other.id !== ghost.id)
      .reduce((penalty, other) => {
        const otherPos = actorPositionInTiles(other)
        const dist = abs(target.row - otherPos.y) + abs(target.col - otherPos.x)
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
    addScore(10)
    playWaka()
  } else if (tile === 'o') {
    setTile(pacman.row, pacman.col, ' ')
    pelletsRemaining--
    addScore(50)
    powerModeRemainingMs = POWER_MODE_MS
    ghostCombo = 0
    startPowerSirenLoop()
  } else if (tile === 'c') {
    setTile(pacman.row, pacman.col, ' ')
    addScore(CHERRY_SCORE + CHERRY_EXTRA_SCORE)
    playCherryPickup()
  }

  if (pelletsRemaining <= 0) {
    gameState = 'won'
    stopPowerSirenLoop()
    playWin()
  }
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
      addScore(200 * 2 ** ghostCombo)
      ghostCombo++
      playGhostEaten()

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

const updateGame = (deltaSeconds: number) => {
  if (gameState !== 'playing') return

  if (roundDelayRemainingMs > 0) {
    roundDelayRemainingMs -= deltaSeconds * 1000

    return
  }

  const hadPowerMode = powerModeRemainingMs > 0

  powerModeRemainingMs = Math.max(0, powerModeRemainingMs - deltaSeconds * 1000)

  if (hadPowerMode && powerModeRemainingMs <= 0) stopPowerSirenLoop()

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

const toWorldPoint = (x: number, y: number) =>
  $v(x - animation.width / 2, animation.height / 2 - y, 0)

const drawLinePixel = (
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: string,
  lineWidth = 1,
) => {
  line(toWorldPoint(x1, y1), toWorldPoint(x2, y2), {
    color,
    lineWidth,
    noSplit: true,
  })
}

const drawFilledRectPixel = (
  x: number,
  y: number,
  width: number,
  height: number,
  color: string,
  opacity = 1,
) => {
  isolateTransformations(() => {
    translate(toWorldPoint(x + width / 2, y + height / 2))
    rect2d(width, height, { color, noStroke: true, opacity })
  })
}

const drawCirclePixel = (
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
) => {
  isolateTransformations(() => {
    translate(toWorldPoint(x, y))
    circle2d(radius, {
      color,
      strokeColor: strokeColor ?? color,
      lineWidth,
      noStroke,
      opacity,
      circleSegments: 28,
    })
  })
}

const drawStrokeRectPixel = (
  x: number,
  y: number,
  width: number,
  height: number,
  color: string,
  lineWidth = 1,
) => {
  drawLinePixel(x, y, x + width, y, color, lineWidth)
  drawLinePixel(x + width, y, x + width, y + height, color, lineWidth)
  drawLinePixel(x + width, y + height, x, y + height, color, lineWidth)
  drawLinePixel(x, y + height, x, y, color, lineWidth)
}

const drawMaze = () => {
  for (let row = 0; row < ROW_COUNT; row++) {
    for (let col = 0; col < COLUMN_COUNT; col++) {
      const tile = getTile(row, col)
      const pixel = tileToPixel(col, row)

      if (tile === '#') {
        drawFilledRectPixel(pixel.x, pixel.y, TILE_SIZE, TILE_SIZE, '#001243')
        drawStrokeRectPixel(pixel.x, pixel.y, TILE_SIZE, TILE_SIZE, '#2f7bff')
      } else if (tile === '.') {
        drawCirclePixel(
          pixel.x + TILE_SIZE / 2,
          pixel.y + TILE_SIZE / 2,
          TILE_SIZE * 0.12,
          { color: '#ffd7a8' },
        )
      } else if (tile === 'o') {
        const pulse = 0.75 + 0.25 * sin(millis() / 120)

        drawCirclePixel(
          pixel.x + TILE_SIZE / 2,
          pixel.y + TILE_SIZE / 2,
          TILE_SIZE * 0.26 * pulse,
          { color: '#fff2df' },
        )
      } else if (tile === 'c') {
        const centerX = pixel.x + TILE_SIZE / 2
        const centerY = pixel.y + TILE_SIZE / 2
        const cherryRadius = TILE_SIZE * 0.18

        drawLinePixel(
          centerX - cherryRadius * 0.45,
          centerY - cherryRadius * 1.45,
          centerX,
          centerY - cherryRadius * 2.25,
          '#66b15b',
          2,
        )
        drawLinePixel(
          centerX,
          centerY - cherryRadius * 2.25,
          centerX + cherryRadius * 0.55,
          centerY - cherryRadius * 1.45,
          '#66b15b',
          2,
        )

        drawCirclePixel(
          centerX - cherryRadius * 0.65,
          centerY + cherryRadius * 0.25,
          cherryRadius,
          { color: '#d3152f' },
        )
        drawCirclePixel(
          centerX + cherryRadius * 0.65,
          centerY + cherryRadius * 0.25,
          cherryRadius,
          { color: '#d3152f' },
        )

        drawCirclePixel(
          centerX - cherryRadius,
          centerY - cherryRadius * 0.1,
          cherryRadius * 0.35,
          { color: 'rgba(255, 255, 255, 0.55)' },
        )
        drawCirclePixel(
          centerX + cherryRadius * 0.3,
          centerY - cherryRadius * 0.1,
          cherryRadius * 0.35,
          { color: 'rgba(255, 255, 255, 0.55)' },
        )
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
  const centerX = pixel.x
  const centerY = pixel.y + bob

  drawCirclePixel(centerX, centerY + radius * 0.95, radius * 0.28, {
    color: 'rgba(0, 0, 0, 0.22)',
    noStroke: true,
  })

  drawCirclePixel(centerX, centerY, radius, {
    color: '#ffd847',
    strokeColor: '#cf9300',
    lineWidth: 1.4,
    noStroke: false,
  })

  const mouthA = {
    x: centerX + radius * 1.1 * Math.cos(angle + mouth),
    y: centerY + radius * 1.1 * Math.sin(angle + mouth),
  }
  const mouthB = {
    x: centerX + radius * 1.1 * Math.cos(angle - mouth),
    y: centerY + radius * 1.1 * Math.sin(angle - mouth),
  }

  triangle2d(
    toWorldPoint(centerX, centerY),
    toWorldPoint(mouthA.x, mouthA.y),
    toWorldPoint(mouthB.x, mouthB.y),
    { color: 'black', noStroke: true },
  )

  const eyeX = centerX + look.dc * radius * 0.22 - look.dr * radius * 0.24
  const eyeY = centerY + look.dr * radius * 0.22 + look.dc * radius * 0.24

  drawCirclePixel(eyeX, eyeY, radius * 0.12, { color: '#f9fcff' })
  drawCirclePixel(
    eyeX + look.dc * radius * 0.03,
    eyeY + look.dr * radius * 0.03,
    radius * 0.065,
    { color: '#16223a' },
  )
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
  const eyeRadius = radius * 0.33
  const pupilRadius = radius * 0.15
  const lookDirection = DIRECTIONS[ghost.dir]
  const frightened = powerModeRemainingMs > 0
  const bodyColor = frightened ? '#2f6eff' : ghost.color

  drawCirclePixel(pixel.x, top + radius, radius, {
    color: bodyColor,
    noStroke: true,
  })

  drawFilledRectPixel(left, pixel.y, radius * 2, radius, bodyColor)

  drawCirclePixel(left + radius * 0.35, bottom, radius * 0.22, {
    color: bodyColor,
  })
  drawCirclePixel(pixel.x, bottom, radius * 0.22, {
    color: bodyColor,
  })
  drawCirclePixel(right - radius * 0.35, bottom, radius * 0.22, {
    color: bodyColor,
  })

  drawCirclePixel(pixel.x - eyeOffsetX, pixel.y - eyeOffsetY, eyeRadius, {
    color: 'white',
  })
  drawCirclePixel(pixel.x + eyeOffsetX, pixel.y - eyeOffsetY, eyeRadius, {
    color: 'white',
  })

  drawCirclePixel(
    pixel.x - eyeOffsetX + lookDirection.dc * eyeRadius * 0.45,
    pixel.y - eyeOffsetY + lookDirection.dr * eyeRadius * 0.45,
    pupilRadius,
    { color: '#111' },
  )
  drawCirclePixel(
    pixel.x + eyeOffsetX + lookDirection.dc * eyeRadius * 0.45,
    pixel.y - eyeOffsetY + lookDirection.dr * eyeRadius * 0.45,
    pupilRadius,
    { color: '#111' },
  )
}

const drawHud = () => {
  text2d(`Score: ${score}`, toWorldPoint(20, 30), '#f4f4f4', {
    fontSize: 18,
    fontFamily: 'monospace',
    fontWeight: 'bold',
    textAlign: 'left',
    textBaseline: 'middle',
  })
  text2d(`Lives: ${lives}`, toWorldPoint(20, 54), '#f4f4f4', {
    fontSize: 18,
    fontFamily: 'monospace',
    fontWeight: 'bold',
    textAlign: 'left',
    textBaseline: 'middle',
  })
  text2d(`Hi Score: ${highScore}`, toWorldPoint(20, 78), '#f4f4f4', {
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

const drawStateOverlay = () => {
  if (roundDelayRemainingMs > 0 && gameState === 'playing') {
    drawFilledRectPixel(
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

  drawFilledRectPixel(
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
    'Press Enter to restart',
    toWorldPoint(animation.width / 2, 70 + 36),
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

const drawScene = () => {
  background('black')
  drawMaze()
  drawPacman()
  ghosts.forEach(drawGhost)
  drawHud()
  drawStateOverlay()
}

const handleKeydown = (event: KeyboardEvent) => {
  resumeAudio()

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
    stopPowerSirenLoop()
    ghostCombo = 0

    for (let row = 0; row < ROW_COUNT; row++) {
      for (let col = 0; col < COLUMN_COUNT; col++) {
        maze[row][col] = MAZE_TEMPLATE[row][col]
      }
    }

    findAndClearMarker('P')
    findAndClearGhostMarkers()
    placeRandomCherries()
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

const draw = () => {
  if (frameCount() % FPS_LOGGING_FRAME_PERIOD === 0) console.log({ fps: fps() })

  const now = millis()
  const deltaSeconds =
    lastTickMillis === null
      ? 1 / FPS
      : Math.min((now - lastTickMillis) / 1000, 0.05)

  lastTickMillis = now

  updateGame(deltaSeconds)
  drawScene()
  render3dScene()
}

const onPaused = () => {
  text2d(
    'PAUSED',
    toWorldPoint(animation.width / 2, animation.height / 2 - 300),
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
