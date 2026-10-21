//////////////////////
// AI-assisted code //
//////////////////////

import { HALF_PI, PI, sin } from '../math_utils.ts'
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
import { millis } from '../utils.ts'
import { $v, Vector3d } from '../vector_3d.ts'
import {
  DirectionName,
  DOWN,
  LEFT,
  NONE,
  RIGHT,
  TILE_SIZE,
  UP,
} from './constants.ts'

/**
 * A point on the canvas, in pixel coordinates.
 */
export type Pixel = { x: number; y: number }

// All maze sprites use this mapping, keeping pixel placement consistent across
// walls, collectibles, and actors.
/**
 * Converts a maze cell coordinate into a pixel position on the canvas.
 *
 * The board is centred inside the canvas, so the returned coordinates depend
 * on the current canvas size.
 *
 * @param tileX - The column of the cell, in maze tiles. Fractional values are
 *   accepted, which makes the helper usable for sprite centres.
 * @param tileY - The row of the cell, in maze tiles. Fractional values are
 *   accepted.
 * @param rowCount - The number of rows of the board. Defaults to `22`.
 * @param columnCount - The number of columns of the board. Defaults to `19`.
 * @returns The pixel position of the cell's top-left corner.
 */
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

/**
 * Converts a canvas pixel position into a world-space point.
 *
 * Canvas Y grows downward while the world renderer grows upward.
 *
 * @param x - The horizontal pixel position, measured from the left edge.
 * @param y - The vertical pixel position, measured from the top edge.
 * @returns A new vector holding the corresponding world-space point.
 */
export function toWorldPoint(x: number, y: number): Vector3d {
  // Canvas Y grows downward while the world renderer grows upward.
  return $v(x - animation.width / 2, animation.height / 2 - y)
}

/**
 * Draws a straight line between two canvas pixel positions.
 *
 * @param x1 - The horizontal position of the first endpoint, in pixels.
 * @param y1 - The vertical position of the first endpoint, in pixels.
 * @param x2 - The horizontal position of the second endpoint, in pixels.
 * @param y2 - The vertical position of the second endpoint, in pixels.
 * @param color - The CSS color of the line.
 * @param lineWidth - The width of the line, in pixels. Defaults to `1`.
 * @returns Nothing; the line is queued for rendering.
 */
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

/**
 * Draws a filled rectangle at a canvas pixel position.
 *
 * @param x - The horizontal position of the rectangle's top-left corner, in
 *   pixels.
 * @param y - The vertical position of the rectangle's top-left corner, in
 *   pixels.
 * @param width - The width of the rectangle, in pixels.
 * @param height - The height of the rectangle, in pixels.
 * @param color - The CSS color used to fill the rectangle.
 * @param opacity - The fill opacity, within the range `[0, 1]`. Defaults to
 *   `1`.
 * @returns Nothing; the rectangle is queued for rendering.
 */
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

/**
 * Draws a circle at a canvas pixel position.
 *
 * @param x - The horizontal position of the circle's centre, in pixels.
 * @param y - The vertical position of the circle's centre, in pixels.
 * @param radius - The radius of the circle, in pixels.
 * @param options - The visual options of the circle.
 * @param options.color - The CSS color used to fill the circle.
 * @param options.strokeColor - The CSS color of the outline. Defaults to
 *   `options.color`.
 * @param options.lineWidth - The width of the outline, in pixels. Defaults to
 *   `1`.
 * @param options.noStroke - Whether the outline should be omitted. Defaults to
 *   `true`.
 * @param options.opacity - The fill opacity, within the range `[0, 1]`.
 *   Defaults to `1`.
 * @returns Nothing; the circle is queued for rendering.
 */
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

/**
 * Draws the outline of a rectangle at a canvas pixel position.
 *
 * @param x - The horizontal position of the rectangle's top-left corner, in
 *   pixels.
 * @param y - The vertical position of the rectangle's top-left corner, in
 *   pixels.
 * @param width - The width of the rectangle, in pixels.
 * @param height - The height of the rectangle, in pixels.
 * @param color - The CSS color of the outline.
 * @param lineWidth - The width of the outline, in pixels. Defaults to `1`.
 * @returns Nothing; the four edges are queued for rendering.
 */
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

/**
 * Converts a gameplay direction into the angle used by the renderer.
 *
 * Directions are converted to renderer angles only at the drawing boundary,
 * so the gameplay code can keep using the readable direction names.
 *
 * @param direction - The direction to convert.
 * @returns The angle of the direction, in radians.
 */
export function directionToAngle(direction: DirectionName): number {
  // Convert named gameplay directions to renderer angles only at the drawing
  // boundary; gameplay code can continue using readable direction names.
  switch (direction) {
    case RIGHT:
      return 0
    case LEFT:
      return PI
    case UP:
      return -HALF_PI
    case DOWN:
      return HALF_PI
    case NONE:
      return 0
    default: {
      const exhaustiveCheck: never = direction
      return exhaustiveCheck
    }
  }
}

/**
 * Draws a power pellet.
 *
 * @param pixel - The pixel position of the cell the pellet belongs to.
 * @returns Nothing; the pellet is queued for rendering.
 */
export function renderPowerPellet(pixel: Pixel) {
  const pulse = 0.75 + 0.25 * sin(millis() / 120)

  renderCirclePixel(
    pixel.x + TILE_SIZE / 2,
    pixel.y + TILE_SIZE / 2,
    TILE_SIZE * 0.26 * pulse,
    { color: '#fff2df' },
  )
}

/**
 * Draws a regular pellet.
 *
 * @param pixel - The pixel position of the cell the pellet belongs to.
 * @returns Nothing; the pellet is queued for rendering.
 */
export function renderPellet(pixel: Pixel) {
  renderCirclePixel(
    pixel.x + TILE_SIZE / 2,
    pixel.y + TILE_SIZE / 2,
    TILE_SIZE * 0.12,
    { color: '#ffd7a8' },
  )
}

/**
 * Draws a maze wall.
 *
 * @param pixel - The pixel position of the cell the wall occupies.
 * @returns Nothing; the wall is queued for rendering.
 */
export function renderWall(pixel: Pixel) {
  // The outline keeps walls legible against the black playfield.
  renderFilledRectPixel(pixel.x, pixel.y, TILE_SIZE, TILE_SIZE, '#001243')
  renderStrokeRectPixel(pixel.x, pixel.y, TILE_SIZE, TILE_SIZE, '#2f7bff')
}

/**
 * Draws the cherry bonus item.
 *
 * @param pixel - The pixel position of the cell the cherry occupies.
 * @returns Nothing; the cherry is queued for rendering.
 */
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

/**
 * Re-exports the text and triangle primitives so the demo can draw them
 * without importing the renderer directly.
 */
export { text2d, triangle2d }
