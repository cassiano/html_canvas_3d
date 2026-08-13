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
  cos,
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

type GameState = 'playing' | 'won' | 'gameOver'

const TILE_SIZE = 24
const PACMAN_RADIUS_RATIO = 0.5
const GHOST_RADIUS_RATIO = 0.44
const BASE_PACMAN_SPEED = 3.5
const BASE_GHOST_SPEED = 3
const POWER_MODE_GHOST_SPEED_FACTOR = 0.72
const POWER_MODE_MS = 7000
const POWER_WARNING_FLASH_MS = 1800
const POWER_WARNING_FLASH_INTERVAL_MS = 140
const CHERRY_SCORE = 200
const CHERRY_EXTRA_SCORE = 150
const CHERRY_VISIBLE_MS = 7000
const CHERRY_RESPAWN_MIN_MS = 9000
const CHERRY_RESPAWN_MAX_MS = 18000
const GHOST_EATEN_BASE_SCORE = 200
const COLLISION_DISTANCE_TILES = 0.5
const ROUND_START_DELAY_MS = 900
const WAKA_INTERVAL_MS = 95
const POWER_SIREN_LOOP_MS = 900
const HIGH_SCORE_STORAGE_KEY = 'demo22_pacman_high_score'

const WALL_MARKER = '◻'
const EMPTY_MARKER = ' '
const PELLET_MARKER = '.'
const POWER_PELLET_MARKER = '⏺'
const CHERRY_MARKER = 'c'

// `P` is reserved for Pac-Man only. Pinky uses `H` to avoid marker ambiguity.
// [/doc_img/main.ts/2026-08-08-12-04-06.png]
const PACMAN_MARKER = 'P'
const BLINKY_MARKER = 'B'
const PINKY_MARKER = 'H'
const INKY_MARKER = 'I'
const CLYDE_MARKER = 'C'

const BLINKY_NAME = 'Blinky'
const PINKY_NAME = 'Pinky'
const INKY_NAME = 'Inky'
const CLYDE_NAME = 'Clyde'

const GHOST_MARKER_SPECS: {
  marker:
    | typeof BLINKY_MARKER
    | typeof PINKY_MARKER
    | typeof INKY_MARKER
    | typeof CLYDE_MARKER
  name:
    | typeof BLINKY_NAME
    | typeof PINKY_NAME
    | typeof INKY_NAME
    | typeof CLYDE_NAME
  color: string
}[] = [
  { marker: BLINKY_MARKER, name: BLINKY_NAME, color: '#FF0000' },
  { marker: PINKY_MARKER, name: PINKY_NAME, color: '#FFB8DE' },
  { marker: INKY_MARKER, name: INKY_NAME, color: '#46BFEE' },
  { marker: CLYDE_MARKER, name: CLYDE_NAME, color: '#FFB847' },
]

type DirectionName = 'up' | 'down' | 'left' | 'right' | 'none'

type GhostName = (typeof GHOST_MARKER_SPECS)[number]['name']
type GhostMarker = (typeof GHOST_MARKER_SPECS)[number]['marker']

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

const OPPOSITE_DIRECTION: Record<DirectionName, DirectionName> = {
  up: 'down',
  down: 'up',
  left: 'right',
  right: 'left',
  none: 'none',
}

// [/doc_img/main.ts/2026-08-10-09-50-36.png]
const MAZE_TEMPLATE = [
  '◻◻◻◻◻◻◻◻◻◻◻◻◻◻◻◻◻◻◻',
  '◻........◻........◻',
  '◻.◻◻.◻◻◻.◻.◻◻◻.◻◻.◻',
  '◻⏺◻◻.◻◻◻.◻.◻◻◻.◻◻⏺◻',
  '◻.................◻',
  '◻.◻◻.◻.◻◻◻◻◻.◻.◻◻.◻',
  '◻....◻...◻...◻....◻',
  '◻◻◻◻.◻◻◻ ◻ ◻◻◻.◻◻◻◻',
  '   ◻.◻       ◻.◻   ',
  '◻◻◻◻.◻ ◻◻B◻◻ ◻.◻◻◻◻',
  '    .  ◻IHC◻  .    ',
  '◻◻◻◻.◻ ◻◻◻◻◻ ◻.◻◻◻◻',
  '   ◻.◻   c   ◻.◻   ',
  '◻◻◻◻.◻ ◻◻◻◻◻ ◻.◻◻◻◻',
  '◻........◻........◻',
  '◻.◻◻.◻◻◻.◻.◻◻◻.◻◻.◻',
  '◻⏺.◻.....P.....◻.⏺◻',
  '◻◻.◻.◻.◻◻◻◻◻.◻.◻.◻◻',
  '◻....◻...◻...◻....◻',
  '◻.◻◻◻◻◻◻.◻.◻◻◻◻◻◻.◻',
  '◻.................◻',
  '◻◻◻◻◻◻◻◻◻◻◻◻◻◻◻◻◻◻◻',
] as const

const ROW_COUNT = MAZE_TEMPLATE.length
const COLUMN_COUNT = MAZE_TEMPLATE[0].length

MAZE_TEMPLATE.forEach((line, row) => {
  if (line.length !== COLUMN_COUNT)
    throw new Error(`Invalid maze width at row ${row}`)
})

abstract class Actor {
  startPosition: Vector3d
  dir: DirectionName
  nextDir: DirectionName
  progress: number

  constructor(
    public position: Vector3d,
    public speedTilesPerSecond: number,
    initialDirection: DirectionName = 'left',
  ) {
    this.startPosition = position.clone()
    this.dir = initialDirection
    this.nextDir = initialDirection
    this.progress = 0
  }

  reset(direction: DirectionName = 'left') {
    this.position = this.startPosition.clone()
    this.progress = 0
    this.dir = direction
    this.nextDir = direction
  }

  positionInTiles(): Vector3d {
    const directionVector = DIRECTIONS[this.dir]

    return this.position
      .clone()
      .add(directionVector.clone().mult(this.progress))
  }

  static nextCell(position: Vector3d, direction: DirectionName): Vector3d {
    const directionVector = DIRECTIONS[direction]

    return position
      .clone()
      .add(directionVector)
      .setX(wrapCol(position.x + directionVector.x))
  }

  static canMove(position: Vector3d, direction: DirectionName): boolean {
    if (direction === 'none') return false

    const target = Actor.nextCell(position, direction)

    return !isWall(target)
  }

  canMoveTo(direction: DirectionName): boolean {
    return Actor.canMove(this.position, direction)
  }

  move(
    deltaSeconds: number,
    chooseDirectionAtCenter?: (actor: Actor) => DirectionName,
  ) {
    let travel = this.speedTilesPerSecond * deltaSeconds

    while (travel > 0) {
      if (this.progress === 0) {
        if (chooseDirectionAtCenter) {
          const selectedDirection = chooseDirectionAtCenter(this)

          if (selectedDirection !== 'none') this.nextDir = selectedDirection
        }

        if (this.canMoveTo(this.nextDir)) this.dir = this.nextDir
        else if (!this.canMoveTo(this.dir)) this.dir = 'none'
      }

      if (this.dir === 'none') return

      if (!this.canMoveTo(this.dir)) {
        this.progress = 0
        this.dir = 'none'

        return
      }

      const remainingToNextTile = 1 - this.progress
      const step = min(remainingToNextTile, travel)

      this.progress += step
      travel -= step

      if (this.progress >= 1) {
        this.position = Actor.nextCell(this.position, this.dir)
        this.progress = 0
      }
    }
  }

  abstract render(): void
}

class Pacman extends Actor {
  render() {
    const position = this.positionInTiles()
    const pixel = tileToPixel(position.x + 0.5, position.y + 0.5)
    const radius = TILE_SIZE * PACMAN_RADIUS_RATIO
    const moving = this.dir !== 'none' && roundDelayRemainingMs <= 0
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

class Ghost extends Actor {
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
  ) {
    super(position, speedTilesPerSecond, initialDirection)
  }

  markEaten(baseSpeed: number, speedMultiplier = 1.6) {
    this.progress = 0
    this.dir = 'none'
    this.nextDir = 'none'
    this.speedTilesPerSecond = baseSpeed * speedMultiplier
    this.isEaten = true
  }

  revive(direction: DirectionName = 'left', speed = BASE_GHOST_SPEED) {
    this.isEaten = false
    this.speedTilesPerSecond = speed
    this.dir = direction
    this.nextDir = direction
  }

  tryReviveAt(
    target: Vector3d,
    direction: DirectionName = 'left',
    speed = BASE_GHOST_SPEED,
  ): boolean {
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
      ;(Object.keys(DIRECTIONS) as DirectionName[]).forEach(dir => {
        if (dir === 'none') return

        const next = Actor.nextCell(current, dir)
        const key = `${next.y},${next.x}`

        if (visited.has(key) || isWall(next)) return

        visited.add(key)
        previous.set(key, { position: current.clone(), dir })
        queue.push(next)
      })
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
  ): Vector3d {
    switch (this.name) {
      case 'Blinky':
        return $v(pacmanPos.x, pacmanPos.y)

      case 'Pinky':
        return pacmanPos
          .clone()
          .add(pacmanFacing.clone().mult(PINKY_LOOKAHEAD_TILES))

      case 'Inky': {
        const pivot = pacmanPos
          .clone()
          .add(pacmanFacing.clone().mult(INKY_LOOKAHEAD_TILES))
        const blinky = ghosts.find(candidate => candidate.name === 'Blinky')

        if (!blinky) return pivot

        const blinkyPos = blinky.positionInTiles()

        return $v(
          pivot.x + (pivot.x - blinkyPos.x),
          pivot.y + (pivot.y - blinkyPos.y),
        )
      }

      case 'Clyde': {
        // Clyde alternates between chase and scatter depending on distance to Pac-Man.
        const deltaToPacman = pacmanPos.clone().sub(this.position)
        const manhattanDistance = abs(deltaToPacman.y) + abs(deltaToPacman.x)

        if (manhattanDistance <= CLYDE_SHY_DISTANCE_TILES)
          return getClydeScatterTarget()

        return $v(pacmanPos.x, pacmanPos.y)
      }

      default: {
        const exhaustiveCheck: never = this.name
        return exhaustiveCheck
      }
    }
  }

  render() {
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
      powerModeRemainingMs > 0 &&
      this.lastEatenPowerModeId !== currentPowerModeId
    const shouldFlashWarning =
      frightened &&
      powerModeRemainingMs <= POWER_WARNING_FLASH_MS &&
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
    renderCirclePixel(pixel.x, bottom, radius * 0.22, {
      color: bodyColor,
    })
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

// renders a power pellet with a pulsing effect.
const renderPowerPellet = (pixel: { x: number; y: number }) => {
  const pulse = 0.75 + 0.25 * sin(millis() / 120)

  renderCirclePixel(
    pixel.x + TILE_SIZE / 2,
    pixel.y + TILE_SIZE / 2,
    TILE_SIZE * 0.26 * pulse,
    { color: '#fff2df' },
  )
}

const renderPellet = (pixel: { x: number; y: number }) => {
  renderCirclePixel(
    pixel.x + TILE_SIZE / 2,
    pixel.y + TILE_SIZE / 2,
    TILE_SIZE * 0.12,
    { color: '#ffd7a8' },
  )
}

const renderWall = (pixel: { x: number; y: number }) => {
  renderFilledRectPixel(pixel.x, pixel.y, TILE_SIZE, TILE_SIZE, '#001243')
  renderStrokeRectPixel(pixel.x, pixel.y, TILE_SIZE, TILE_SIZE, '#2f7bff')
}

// renders a cherry with a stem and two leaves.
const renderCherry = (pixel: { x: number; y: number }) => {
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

const PINKY_LOOKAHEAD_TILES = 4
const INKY_LOOKAHEAD_TILES = 2
const CLYDE_SHY_DISTANCE_TILES = 8

const getClydeScatterTarget = (): Vector3d => $v(1, ROW_COUNT - 2)

const getGhostHouseCenterTarget = (): Vector3d =>
  $v(
    ghostStarts.find(ghost => ghost.name === 'Pinky')?.position.x ??
      floor(
        ghostStarts.reduce((sum, ghost) => sum + ghost.position.x, 0) /
          ghostStarts.length,
      ),
    ghostStarts.find(ghost => ghost.name === 'Pinky')?.position.y ??
      floor(
        ghostStarts.reduce((sum, ghost) => sum + ghost.position.y, 0) /
          ghostStarts.length,
      ),
  )

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

  for (let i = 0; i < bufferSize; i++) data[i] = random() * 2 - 1

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

const maze: Tile[][] = MAZE_TEMPLATE.map(line => line.split('') as Tile[])

const findAndClearMarker = (marker: Tile): Vector3d => {
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

const findAndClearGhostMarkers = (): {
  position: Vector3d
  marker: GhostMarker
  name: GhostName
  color: string
}[] =>
  GHOST_MARKER_SPECS.map(spec => {
    const position = findAndClearMarker(spec.marker)

    return {
      ...spec,
      position,
    }
  })

const pacmanStart = findAndClearMarker(PACMAN_MARKER)
const ghostStarts = findAndClearGhostMarkers()
const cherrySpawnPosition = findAndClearMarker(CHERRY_MARKER)

const pacman = new Pacman(pacmanStart, BASE_PACMAN_SPEED)

const ghosts: Ghost[] = ghostStarts.map(
  (start, index) =>
    new Ghost(
      start.position,
      BASE_GHOST_SPEED,
      index % 2 === 0 ? 'left' : 'right',
      index,
      start.name,
      start.marker,
      start.color,
    ),
)

const getTile = (position: Vector3d): Tile => {
  return maze[position.y][position.x] ?? WALL_MARKER
}

const setTile = (position: Vector3d, value: Tile): void => {
  maze[position.y][position.x] = value
}

const resetMazeFromTemplate = () => {
  timesForEachN([COLUMN_COUNT, ROW_COUNT], (col, row) => {
    maze[row][col] = MAZE_TEMPLATE[row][col] as Tile
  })

  findAndClearMarker(PACMAN_MARKER)
  findAndClearGhostMarkers()

  findAndClearMarker(CHERRY_MARKER)
  resetCherryCycle()

  pelletsRemaining = countRemainingPellets()
}

const randomCherryRespawnDelayMs = () =>
  CHERRY_RESPAWN_MIN_MS +
  random() * (CHERRY_RESPAWN_MAX_MS - CHERRY_RESPAWN_MIN_MS)

let cherryVisibleRemainingMs = 0
let cherryRespawnRemainingMs = randomCherryRespawnDelayMs()

const hideCherry = () => {
  if (getTile(cherrySpawnPosition) === CHERRY_MARKER)
    setTile(cherrySpawnPosition, EMPTY_MARKER)
}

const showCherry = () => {
  setTile(cherrySpawnPosition, CHERRY_MARKER)
}

const resetCherryCycle = () => {
  hideCherry()

  cherryVisibleRemainingMs = 0
  cherryRespawnRemainingMs = randomCherryRespawnDelayMs()
}

const updateCherryCycle = (deltaSeconds: number) => {
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

const isWall = (position: Vector3d): boolean =>
  getTile(position) === WALL_MARKER

const wrapCol = (col: number): number => {
  if (col < 0) return COLUMN_COUNT - 1
  if (col >= COLUMN_COUNT) return 0

  return col
}

const countRemainingPellets = (): number => {
  let count = 0

  timesForEachN([COLUMN_COUNT, ROW_COUNT], (col, row) => {
    const tile = getTile($v(col, row))

    if (tile === PELLET_MARKER || tile === POWER_PELLET_MARKER) count++
  })

  return count
}

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

const syncGhostSpeedsForPowerMode = () => {
  const ghostSpeed =
    powerModeRemainingMs > 0
      ? BASE_GHOST_SPEED * POWER_MODE_GHOST_SPEED_FACTOR
      : BASE_GHOST_SPEED

  ghosts.forEach(ghost => {
    if (ghost.isEaten) return

    ghost.speedTilesPerSecond = ghostSpeed
  })
}

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

const resetRound = () => {
  pacman.reset('left')

  ghosts.forEach((ghost, index) => {
    ghost.reset(index % 2 === 0 ? 'left' : 'right')
    ghost.speedTilesPerSecond = BASE_GHOST_SPEED
    ghost.isEaten = false
  })

  powerModeRemainingMs = 0
  stopPowerSirenLoop()
  ghostCombo = 0
  roundDelayRemainingMs = ROUND_START_DELAY_MS
  syncGhostSpeedsForPowerMode()
  resetCherryCycle()
}

const getPacmanFacing = (): DirectionName =>
  pacman.dir !== 'none' ? pacman.dir : pacman.nextDir

const chooseGhostDirection = (ghost: Ghost): DirectionName => {
  if (ghost.isEaten) {
    const target = getGhostHouseCenterTarget()

    if (ghost.tryReviveAt(target, 'left', BASE_GHOST_SPEED)) return 'none'

    return ghost.nextDirectionToTarget(target)
  }

  const candidates = (Object.keys(DIRECTIONS) as DirectionName[]).filter(
    dir => {
      if (dir === 'none') return false
      if (!Actor.canMove(ghost.position, dir)) return false

      return dir !== OPPOSITE_DIRECTION[ghost.dir]
    },
  )

  const directions =
    candidates.length > 0
      ? candidates
      : (Object.keys(DIRECTIONS) as DirectionName[]).filter(
          dir => dir !== 'none' && Actor.canMove(ghost.position, dir),
        )

  if (directions.length === 0) return 'none'

  if (powerModeRemainingMs > 0) {
    const powerRatio = max(0, min(1, powerModeRemainingMs / POWER_MODE_MS))
    const fleeWeight = 0.55 + powerRatio * 1.25
    const spacingWeight = 0.05 + powerRatio * 0.17
    const uncertaintyWeight = (1 - powerRatio) * 1.1
    const pacmanPos = pacman.positionInTiles()
    let fleeDirection = directions[0]
    let bestFleeScore = Number.NEGATIVE_INFINITY

    directions.forEach(dir => {
      const target = Actor.nextCell(ghost.position, dir)
      const deltaToPacman = target.clone().sub(pacmanPos)
      const fleeDistance = abs(deltaToPacman.y) + abs(deltaToPacman.x)

      // Slightly spread frightened ghosts so they don't bunch up while fleeing.
      const spacingBonus = ghosts
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

  const overlappingGhosts = ghosts.filter(
    other =>
      other.id !== ghost.id &&
      other.progress === 0 &&
      ghost.progress === 0 &&
      other.position.equals(ghost.position),
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

  const pacmanPos = pacman.positionInTiles()
  const chaseTarget = ghost.getChaseTarget(
    pacmanPos,
    DIRECTIONS[getPacmanFacing()],
    ghosts,
  )

  let bestDirection = directions[0]
  let bestScore = Number.POSITIVE_INFINITY

  directions.forEach(dir => {
    const target = Actor.nextCell(ghost.position, dir)
    const deltaToChaseTarget = target.clone().sub(chaseTarget)
    const chaseDistance = abs(deltaToChaseTarget.y) + abs(deltaToChaseTarget.x)

    // Penalize candidate directions that keep ghosts clustered.
    const crowdPenalty = ghosts
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

const getClosestCollectibleDistance = (position: Vector3d): number => {
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

const chooseDemoPacmanDirection = (): DirectionName => {
  const candidates = (Object.keys(DIRECTIONS) as DirectionName[]).filter(
    dir => {
      if (dir === 'none') return false
      if (!Actor.canMove(pacman.position, dir)) return false

      return dir !== OPPOSITE_DIRECTION[pacman.dir]
    },
  )

  const directions =
    candidates.length > 0
      ? candidates
      : (Object.keys(DIRECTIONS) as DirectionName[]).filter(
          dir => dir !== 'none' && Actor.canMove(pacman.position, dir),
        )

  if (directions.length === 0) return 'none'

  const scoredDirections = directions
    .map(dir => {
      const next = Actor.nextCell(pacman.position, dir)
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
    .sort((a, b) => a.score - b.score)

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

const consumePacmanTile = (isDemoMode = false) => {
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
    powerModeRemainingMs = POWER_MODE_MS
    ghostCombo = 0
    syncGhostSpeedsForPowerMode()
    if (!isDemoMode) startPowerSirenLoop()
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
      gameState = 'won'
      stopPowerSirenLoop()
      playWin()
    }
  }
}

const checkGhostCollisions = (isDemoMode = false) => {
  const pacmanPos = pacman.positionInTiles()

  ghosts.forEach(ghost => {
    if (ghost.isEaten) return

    const ghostPos = ghost.positionInTiles()
    const distance = ghostPos.dist(pacmanPos)

    if (distance > COLLISION_DISTANCE_TILES) return

    if (powerModeRemainingMs > 0) {
      if (ghost.lastEatenPowerModeId === currentPowerModeId) return

      ghost.lastEatenPowerModeId = currentPowerModeId
      ghost.markEaten(BASE_GHOST_SPEED)
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

const updateGame = (deltaSeconds: number) => {
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

    ghosts.forEach(ghost =>
      ghost.move(deltaSeconds, actor => chooseGhostDirection(actor as Ghost)),
    )

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

  ghosts.forEach(ghost =>
    ghost.move(deltaSeconds, actor => chooseGhostDirection(actor as Ghost)),
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
  $v(x - animation.width / 2, animation.height / 2 - y)

const renderLinePixel = (
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

const renderFilledRectPixel = (
  x: number,
  y: number,
  width: number,
  height: number,
  color: string,
  opacity = 1,
) => {
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

const renderCirclePixel = (
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
      isDoubleSided: true,
    })
  })
}

const renderStrokeRectPixel = (
  x: number,
  y: number,
  width: number,
  height: number,
  color: string,
  lineWidth = 1,
) => {
  renderLinePixel(x, y, x + width, y, color, lineWidth)
  renderLinePixel(x + width, y, x + width, y + height, color, lineWidth)
  renderLinePixel(x + width, y + height, x, y + height, color, lineWidth)
  renderLinePixel(x, y + height, x, y, color, lineWidth)
}

const renderMaze = () => {
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

const directionToAngle = (direction: DirectionName): number => {
  switch (direction) {
    case 'right':
      return 0
    case 'left':
      return PI
    case 'up':
      return -HALF_PI
    case 'down':
      return HALF_PI
    default:
      return 0
  }
}

const renderHud = () => {
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

const renderStateOverlay = () => {
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

const renderScene = () => {
  renderMaze()

  pacman.render()
  ghosts.forEach(ghost => ghost.render())

  renderHud()
  renderStateOverlay()
}

const handleKeydown = (event: KeyboardEvent) => {
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

const draw = () => {
  if (frameCount() % FPS_LOGGING_FRAME_PERIOD === 0) console.log({ fps: fps() })

  background('black')

  const now = millis()
  const deltaSeconds =
    lastTickMillis === null ? 1 / FPS : min((now - lastTickMillis) / 1000, 0.05)

  lastTickMillis = now

  updateGame(deltaSeconds)
  renderScene()
}

const onPaused = () => {
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
