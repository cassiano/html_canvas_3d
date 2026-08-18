import {
  animation,
  circle2d,
  isolateTransformations,
  line,
  rect2d,
  text2d,
  translate,
  triangle2d,
} from '../primitives.ts'
import { HALF_PI, PI, sin } from '../math_utils.ts'
import { $v, Vector3d } from '../vector_3d.ts'
import { millis } from '../utils.ts'
import {
  TILE_SIZE,
  DirectionName,
  RIGHT_DIRECTION,
  LEFT_DIRECTION,
  UP_DIRECTION,
  DOWN_DIRECTION,
  NONE_DIRECTION,
} from './constants.ts'

export type Pixel = { x: number; y: number }

// All maze sprites use this mapping, keeping pixel placement consistent across
// walls, collectibles, and actors.
export function tileToPixel(
  tileX: number,
  tileY: number,
  rowCount = 22,
  columnCount = 19,
): Pixel {
  const boardWidth = columnCount * TILE_SIZE
  const boardHeight = rowCount * TILE_SIZE
  const offsetX = (animation.width - boardWidth) / 2
  const offsetY = (animation.height - boardHeight) / 2

  return {
    x: offsetX + tileX * TILE_SIZE,
    y: offsetY + tileY * TILE_SIZE,
  }
}

export function toWorldPoint(x: number, y: number): Vector3d {
  // Canvas Y grows downward while the world renderer grows upward.
  return $v(x - animation.width / 2, animation.height / 2 - y)
}

export function renderLinePixel(
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

export function renderFilledRectPixel(
  x: number,
  y: number,
  width: number,
  height: number,
  color: string,
  opacity = 1,
) {
  // Isolate the temporary translation so one pixel primitive cannot affect the
  // transform used by the next primitive.
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

export function renderCirclePixel(
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
  // Pixel-space circles use the same isolated-transform convention as rects.
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

export function renderStrokeRectPixel(
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

export function directionToAngle(direction: DirectionName): number {
  // Convert named gameplay directions to renderer angles only at the drawing
  // boundary; gameplay code can continue using readable direction names.
  switch (direction) {
    case RIGHT_DIRECTION:
      return 0
    case LEFT_DIRECTION:
      return PI
    case UP_DIRECTION:
      return -HALF_PI
    case DOWN_DIRECTION:
      return HALF_PI
    case NONE_DIRECTION:
      return 0
    default: {
      const exhaustiveCheck: never = direction
      return exhaustiveCheck
    }
  }
}

export function renderPowerPellet(pixel: Pixel) {
  const pulse = 0.75 + 0.25 * sin(millis() / 120)

  renderCirclePixel(
    pixel.x + TILE_SIZE / 2,
    pixel.y + TILE_SIZE / 2,
    TILE_SIZE * 0.26 * pulse,
    { color: '#fff2df' },
  )
}

export function renderPellet(pixel: Pixel) {
  renderCirclePixel(
    pixel.x + TILE_SIZE / 2,
    pixel.y + TILE_SIZE / 2,
    TILE_SIZE * 0.12,
    { color: '#ffd7a8' },
  )
}

export function renderWall(pixel: Pixel) {
  // The outline keeps walls legible against the black playfield.
  renderFilledRectPixel(pixel.x, pixel.y, TILE_SIZE, TILE_SIZE, '#001243')
  renderStrokeRectPixel(pixel.x, pixel.y, TILE_SIZE, TILE_SIZE, '#2f7bff')
}

export function renderCherry(pixel: Pixel) {
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

export { text2d, triangle2d }
