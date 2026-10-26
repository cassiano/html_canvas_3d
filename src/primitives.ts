import {
  AXES,
  DEFAULT_ARROW_CIRCLE_SEGMENTS,
  DEFAULT_CIRCLE_SEGMENTS,
  DEFAULT_SPHERE_LINES,
  MAX_LINE_SEGMENT_SIZE,
  NORMAL_CONFIG,
  ORIGIN,
  Z_EPSILON,
  ZERO_VECTOR,
} from './constants.ts'
import {
  abs,
  cos,
  floor,
  HALF_PI,
  map,
  max,
  min,
  multiply4x4Matrices,
  multiply4x4MatrixBy4dPoint,
  PI,
  polarToCartesian2d,
  sin,
  TWO_PI,
} from './math_utils.ts'
import { Tuple } from './utility_types.ts'
import { timesForEach, timesForEachN } from './utils.ts'
import { $v, Vector3d } from './vector_3d.ts'

const FOURTH_DIMENSION_COORD = 1

/**
 * The canvas element every demo draws into.
 */
export const animation = document.getElementById(
  'animation',
) as HTMLCanvasElement

/**
 * The 2D rendering context of {@link animation}.
 */
/**
 * The 2D rendering context used to draw onto the canvas.
 * @example
 * ```ts
 * import { ctx } from './primitives.ts'
 * ctx.fillStyle = 'red'
 * ctx.fillRect(0, 0, 100, 100)
 * ```
 */
export const ctx = animation.getContext('2d')!

/**
 * The visual options accepted by every shape primitive.
 */
export interface ShapeOptions {
  /** The fill color of the shape. */
  color?: string | CanvasGradient | CanvasPattern
  /** The stroke width, in pixels. */
  lineWidth?: number
  /** The fill opacity, within the range `[0, 1]`. */
  opacity?: number
  /** The stroke color of the shape. */
  strokeColor?: string | CanvasGradient | CanvasPattern
  /** Whether the outline should be omitted. */
  noStroke?: boolean
  /** The size of the shape, in pixels. */
  size?: number
  /** Whether the shape should be drawn as a single unsplit segment. Used for lines and arrows. */
  noSplit?: boolean
  /** Whether the shape should be rendered from both sides. */
  isDoubleSided?: boolean
  /** Whether the surface normal of the shape should never be displayed. */
  nevershowNormals?: boolean
  /** The fraction of the shape that should be drawn, within the range `[0, 1]`. */
  percentage?: number
}

/**
 * The default values applied to every {@link ShapeOptions} field.
 */
export const DEFAULT_SHAPE_OPTIONS: Required<ShapeOptions> = {
  color: 'gray',
  lineWidth: 1,
  opacity: 1,
  strokeColor: 'black',
  noStroke: false,
  size: 1,
  noSplit: false,
  isDoubleSided: false,
  nevershowNormals: false,
  percentage: 1.0,
}

const deferredRenderList: {
  id: number
  z: number
  renderFn: () => void
}[] = []

// https://en.wikipedia.org/wiki/Painter%27s_algorithm
/**
 * Draws every shape queued since the last call, from the farthest to the
 * nearest one.
 *
 * This implements the painter's algorithm: shapes are sorted by their depth
 * and painted back-to-front, so nearer shapes overlap farther ones. The queue
 * is emptied afterwards, so it must be called once per frame.
 */
export const render3dScene = () => {
  const orderedList = deferredRenderList.toSorted((left, right) =>
    abs(left.z - right.z) < Z_EPSILON ? left.id - right.id : left.z - right.z,
  )

  orderedList.forEach(element => element.renderFn())

  deferredRenderList.length = 0
}

/**
 * The center of the canvas, expressed in world coordinates.
 */
export const SCREEN_CENTER = $v(animation.width / 2, animation.height / 2, 0)

const getScreenCenter = () => $v(animation.width / 2, animation.height / 2, 0)

const getAxisLength = () => min(animation.width, animation.height) * 0.6

/**
 * Whether surface normals are currently displayed.
 */
export let showNormals = false

/**
 * Whether the coordinate axes are currently drawn.
 */
export let render3dAxesEnabled = true

/**
 * Whether the demos should auto-rotate their scene.
 */
export let autoRotationEnabled = true

/**
 * Toggles the display of surface normals.
 *
 * @param value - `true` to display normals.
 */
export const setshowNormals = (value: boolean) => {
  showNormals = value
}

/**
 * Toggles the display of the coordinate axes.
 *
 * @param value - `true` to draw the axes.
 */
export const setRender3dAxesEnabled = (value: boolean) => {
  render3dAxesEnabled = value
}

/**
 * Toggles the auto-rotation of the scene.
 *
 * @param value - `true` to let the demos rotate their scene.
 */
export const setAutoRotationCheckboxEnabled = (value: boolean) => {
  autoRotationEnabled = value
}

/**
 * A 4x4 transformation matrix, stored as a tuple of rows.
 */
export type transformationMatrix4x4Type = Tuple<Tuple<number, 4>, 4>

/**
 * The identity transformation matrix used as the baseline of every scene.
 */
export const DEFAULT_TRANSFORMATION_MATRIX: transformationMatrix4x4Type =
  // Use ĵ as [0, -1, 0, 0] so the Y-axis in completely inverted, pointing up.
  // prettier-ignore
  [
  //  ȋ   ĵ   k̂   w
  // --  --  --  --
    [ 1,  0,  0,  0 ],
    [ 0, -1,  0,  0 ],
    [ 0,  0,  1,  0 ],
    [ 0,  0,  0,  1 ],
  ] as const

let transformationMatrix: transformationMatrix4x4Type =
  DEFAULT_TRANSFORMATION_MATRIX.map(row => [
    ...row,
  ]) as transformationMatrix4x4Type
const transformatioMatrixStack: transformationMatrix4x4Type[] = []

const cloneTransformationMatrix = (
  data: transformationMatrix4x4Type,
): transformationMatrix4x4Type =>
  data.map(row => [...row]) as transformationMatrix4x4Type

let zoomLevel = 1
const dragRotation = $v(0, 0)
const panOffset = $v(0, 0)

/**
 * Replaces the rotation applied by the user's dragging gesture.
 *
 * @param x - The rotation around the X-axis, in radians.
 * @param y - The rotation around the Y-axis, in radians.
 */
export const setDragRotation = (x: number, y: number) => {
  dragRotation.x = x
  dragRotation.y = y
}

/**
 * Adds to the rotation applied by the user's dragging gesture.
 *
 * @param x - The rotation to add around the X-axis, in radians.
 * @param y - The rotation to add around the Y-axis, in radians.
 */
export const addDragRotation = (x: number, y: number) => {
  dragRotation.add(x, y)
}

/**
 * Clears the rotation applied by the user's dragging gesture.
 */
export const resetDragRotation = () => setDragRotation(0, 0)

/**
 * Replaces the zoom factor applied to the scene.
 *
 * @param z - The new zoom factor.
 */
export const setZoom = (z: number) => {
  zoomLevel = z
}

/**
 * Adds to the zoom factor applied to the scene.
 *
 * @param delta - The amount to add to the zoom factor.
 */
export const addZoom = (delta: number) => {
  zoomLevel += delta
}

/**
 * Restores the default zoom factor.
 */
export const resetZoom = () => setZoom(1)

/**
 * Replaces the offset used to pan the scene.
 *
 * @param x - The horizontal offset, in pixels.
 * @param y - The vertical offset, in pixels.
 */
export const setPanOffset = (x: number, y: number) => {
  panOffset.x = x
  panOffset.y = y
}

/**
 * Adds to the offset used to pan the scene.
 *
 * @param x - The horizontal offset to add, in pixels.
 * @param y - The vertical offset to add, in pixels.
 */
export const addPanOffset = (x: number, y: number) => {
  panOffset.add(x, y)
}

/**
 * Clears the offset used to pan the scene.
 */
export const resetPanOffset = () => setPanOffset(0, 0)

/**
 * Resets the transformation matrix to its default state, re-applying the
 * current zoom and drag rotation.
 */
export const resetTransformationMatrix = () => {
  transformationMatrix = cloneTransformationMatrix(
    DEFAULT_TRANSFORMATION_MATRIX,
  )

  scale(zoomLevel)
  rotateY(dragRotation.y)
  rotateX(dragRotation.x)
}

/**
 * Saves the current transformation matrix onto the transformation stack.
 */
export const push = () => {
  transformatioMatrixStack.push(cloneTransformationMatrix(transformationMatrix))
}

/**
 * Restores the transformation matrix from the top of the transformation stack.
 *
 * @throws {Error} When the transformation stack is empty.
 */
export const pop = () => {
  const matrix = transformatioMatrixStack.pop()

  if (matrix === undefined) throw new Error('Empty transformation matrix stack')

  transformationMatrix = matrix
}

/**
 * Synonym for {@link push}, as used by Processing.
 */
export const pushMatrix = push

/**
 * Synonym for {@link pop}, as used by Processing.
 */
export const popMatrix = pop

/**
 * Runs a function with an isolated transformation state, restoring the
 * previous state afterwards.
 *
 * @param fn - The function to run.
 */
export const isolateTransformations = (fn: () => void) => {
  push()
  fn()
  pop()
}

/**
 * Synonym for {@link isolateTransformations}.
 */
export const restoreCoordinateSystem = isolateTransformations

interface ScaleOverloadedSignatures {
  (x: number, y: number, z: number): void
  (xyz: number): void
  (vector: Vector3d): void
}

/**
 * Scales the scene.
 *
 * @param x - The scale factor on the X-axis, when using the `(x, y, z)`
 *   overload.
 * @param y - The scale factor on the Y-axis, when using the `(x, y, z)`
 *   overload.
 * @param z - The scale factor on the Z-axis, when using the `(x, y, z)`
 *   overload.
 * @param xyz - The scale factor applied to every axis, when using the
 *   single-number overload.
 * @param vector - The per-axis scale factors, when using the vector overload.
 */
export const scale: ScaleOverloadedSignatures = (
  xOrXyzOrVector: number | Vector3d,
  y?: number,
  z?: number,
): void => {
  const vector =
    typeof xOrXyzOrVector === 'number'
      ? typeof y === 'number'
        ? $v(xOrXyzOrVector, y, z!) // 1st signature: (x, y, z)
        : $v(xOrXyzOrVector, xOrXyzOrVector, xOrXyzOrVector) // 2nd signature: (xyz)
      : xOrXyzOrVector // 3rd signature: (vector)

  if (vector.isAllOnes()) return

  {
    const { x, y, z } = vector

    transformationMatrix = multiply4x4Matrices(
      transformationMatrix,
      // prettier-ignore
      [
      //  ȋ  ĵ  k̂  w
      // -- -- -- --
        [ x, 0, 0, 0 ],
        [ 0, y, 0, 0 ],
        [ 0, 0, z, 0 ],
        [ 0, 0, 0, 1 ],
      ] as const,
    ) as transformationMatrix4x4Type
  }
}

interface TranslateOverloadedSignatures {
  (x: number, y: number, z?: number): void
  (vector: Vector3d): void
}

// Translate using an "Affine Transformation".
/**
 * Translates the scene.
 *
 * @param x - The offset on the X-axis, when using the coordinate overload.
 * @param y - The offset on the Y-axis, when using the coordinate overload.
 * @param z - The offset on the Z-axis, when using the coordinate overload.
 * @param vector - The offset, when using the vector overload.
 */
export const translate: TranslateOverloadedSignatures = (
  xOrVector: number | Vector3d,
  y?: number,
  z?: number,
) => {
  const vector =
    typeof xOrVector === 'number' ? $v(xOrVector, y!, z!) : xOrVector

  if (vector.isAllZeros()) return

  {
    const { x, y, z } = vector

    transformationMatrix = multiply4x4Matrices(
      transformationMatrix,
      // prettier-ignore
      [
      //  ȋ  ĵ  k̂  w
      // -- -- -- --
        [ 1, 0, 0, x ],
        [ 0, 1, 0, y ],
        [ 0, 0, 1, z ],
        [ 0, 0, 0, 1 ],
      ] as const,
    ) as transformationMatrix4x4Type
  }
}

// https://aistudio.google.com/app/prompts?state=%7B%22ids%22:%5B%221OL6ezsueUbeXeq3_HvOMHkaVCwXvLuDK%22%5D,%22action%22:%22open%22,%22userId%22:%22113757018662815530084%22,%22resourceKeys%22:%7B%7D%7D&usp=sharing
// Counter-clockwise rotation around an arbitrary axis.
/**
 * Rotates the scene counter-clockwise around an arbitrary axis.
 *
 * @param angle - The rotation angle, in radians.
 * @param axis - The axis to rotate around. It does not need to be normalized.
 * @param options - Additional options.
 * @param options.isCanonical - Set it to `true` when `axis` is already a unit
 *   vector, to skip normalizing it.
 */
export const rotate = (
  angle: number,
  axis: Vector3d,
  { isCanonical = false } = {},
) => {
  if (angle === 0) return

  const normalizedAxis = isCanonical ? axis : axis.clone().normalize()
  const { x, y, z } = normalizedAxis

  const c = cos(angle)
  const s = sin(angle)
  const t = 1 - c // Used frequently in the formula.
  const tx = t * x
  const ty = t * y
  const tz = t * z

  transformationMatrix = multiply4x4Matrices(
    transformationMatrix,
    // prettier-ignore
    [
    //        ȋ               ĵ                k̂         w
    //  --------------  --------------  --------------  --
      [     tx * x + c, tx * y - s * z, tx * z + s * y,  0 ],
      [ ty * x + s * z,     ty * y + c, ty * z - s * x,  0 ],
      [ tz * x - s * y, tz * y + s * x,     tz * z + c,  0 ],
      [              0,              0,              0,  1 ],
    ] as const,
  ) as transformationMatrix4x4Type
}

// Counter-clockwise rotation around the X axis.
/**
 * Rotates the scene counter-clockwise around the X-axis.
 *
 * @param angle - The rotation angle, in radians.
 */
export const rotateX = (angle: number) => {
  if (angle === 0) return

  const c = cos(angle)
  const s = sin(angle)

  transformationMatrix = multiply4x4Matrices(
    transformationMatrix,
    // prettier-ignore
    [
    //  ȋ   ĵ   k̂   w
    // --  --  --  --
      [ 1,  0,  0,  0 ],
      [ 0,  c, -s,  0 ],
      [ 0,  s,  c,  0 ],
      [ 0,  0,  0,  1 ],
    ] as const,
  ) as transformationMatrix4x4Type

  // Equivalent to: `rotate(angle, AXES.x, { isCanonical: true })`
}

// Counter-clockwise rotation around the Y axis.
/**
 * Rotates the scene counter-clockwise around the Y-axis.
 *
 * @param angle - The rotation angle, in radians.
 */
export const rotateY = (angle: number) => {
  if (angle === 0) return

  const c = cos(angle)
  const s = sin(angle)

  // Notice that in a Right-Handed Rule (RHR) System, Z precedes X, which flips the position of the
  // sine components in the matrix relative to the X and Z array indices.
  // https://aistudio.google.com/app/prompts?state=%7B%22ids%22:%5B%221MYF8XOCxzwwbRhGazZAHx-3ZUvSLI82I%22%5D,%22action%22:%22open%22,%22userId%22:%22113757018662815530084%22,%22resourceKeys%22:%7B%7D%7D&usp=sharing
  transformationMatrix = multiply4x4Matrices(
    transformationMatrix,
    // prettier-ignore
    [
    //   ȋ   ĵ   k̂   w
    //  --  --  --  --
      [  c,  0,  s,  0 ],
      [  0,  1,  0,  0 ],
      [ -s,  0,  c,  0 ],
      [  0,  0,  0,  1 ],
    ] as const,
  ) as transformationMatrix4x4Type

  // Equivalent to: `rotate(angle, AXES.y, { isCanonical: true })`
}

// Counter-clockwise rotation around the Z axis.
/**
 * Rotates the scene counter-clockwise around the Z-axis.
 *
 * @param angle - The rotation angle, in radians.
 */
export const rotateZ = (angle: number) => {
  if (angle === 0) return

  const c = cos(angle)
  const s = sin(angle)

  transformationMatrix = multiply4x4Matrices(
    transformationMatrix,
    // prettier-ignore
    [
    //  ȋ   ĵ   k̂   w
    // --  --  --  --
      [ c, -s,  0,  0 ],
      [ s,  c,  0,  0 ],
      [ 0,  0,  1,  0 ],
      [ 0,  0,  0,  1 ],
    ] as const,
  ) as transformationMatrix4x4Type

  // Equivalent to: `rotate(angle, AXES.z, { isCanonical: true })`
}

/**
 * Fills the whole canvas with a solid color.
 *
 * @param color - The CSS color to fill the canvas with.
 * @example
 * ```ts
 * import { background } from './primitives.ts'
 * background('lightGray')
 * ```
 */
export const background = (color: string) => {
  ctx.fillStyle = color
  ctx.fillRect(0, 0, animation.width, animation.height)
}

// Define the FOV (π/4 = 45 degrees is considered a standard "natural" look).
const FOV = PI / 4

// Create a helper to get the consistent focal length.
const getCurrentFocalLength = () => {
  const viewDimension = min(animation.width, animation.height)

  return viewDimension / (2 * Math.tan(FOV / 2))
}

// Updated projection function.
/**
 * Projects a world-space point onto the screen using a perspective
 * projection.
 *
 * @param point - The world-space point to project.
 * @returns The projected 2D point, or `undefined` when the point lies behind
 *   the camera.
 */
export const project3dTo2d = ({ x, y, z }: Vector3d) => {
  const focalLength = getCurrentFocalLength()
  const divisor = focalLength - z

  if (divisor <= 0) return

  const perspectiveScale = focalLength / divisor

  return $v(x * perspectiveScale, y * perspectiveScale)
}

// https://aistudio.google.com/app/prompts?state=%7B%22ids%22:%5B%2218pwbUVcOk6C_ICb7JXo82YBAFzJMpz_a%22%5D,%22action%22:%22open%22,%22userId%22:%22113757018662815530084%22,%22resourceKeys%22:%7B%7D%7D&usp=sharing
/**
 * Moves a point to the center of the canvas, applying the current pan offset.
 *
 * @param point - The point to centralize. When omitted, the canvas center
 *   itself is returned.
 * @returns The centralized point, or `undefined` when no point was given.
 */
export const centralize = (point?: Vector3d) =>
  point?.clone().add(getScreenCenter()).add(panOffset)

// Optimized versions.
/**
 * Applies the current transformation matrix to a world-space point.
 *
 * @param point - The point to transform.
 * @returns The transformed point.
 */
export const transform = (point: Vector3d): Vector3d =>
  $v(
    ...multiply4x4MatrixBy4dPoint(transformationMatrix, [
      point.x,
      point.y,
      point.z,
      FOURTH_DIMENSION_COORD,
    ]),
  )

// https://aistudio.google.com/app/prompts?state=%7B%22ids%22:%5B%221bVRsjpez2q3HdcsuDn1nKKO_de1Zmyly%22%5D,%22action%22:%22open%22,%22userId%22:%22113757018662815530084%22,%22resourceKeys%22:%7B%7D%7D&usp=sharing, https://drive.google.com/file/d/1bvI7QTO-_Yvs8iV2MDNuaO-NVDi9NYnq/view?usp=sharing
/**
 * Applies the current transformation matrix to a direction vector, ignoring
 * translation.
 *
 * @param point - The direction vector to transform.
 * @returns The transformed direction vector.
 */
export const transformNormal = (point: Vector3d): Vector3d =>
  $v(
    ...multiply4x4MatrixBy4dPoint(transformationMatrix, [
      point.x,
      point.y,
      point.z,
      0,
    ]),
  )

const toScreen = (point: Vector3d) =>
  centralize(project3dTo2d(transform(point)))

/**
 * Draws a single point.
 *
 * @param point3d - The world-space position of the point.
 * @param options - The shape options.
 */
export const point = (point3d: Vector3d, options: ShapeOptions = {}) => {
  const finalOptions = { ...DEFAULT_SHAPE_OPTIONS, ...options }
  const { color, size, opacity } = finalOptions

  const screen = toScreen(point3d)

  // Skip rendering if point is behind camera.
  if (!screen) return

  const renderFn = () => {
    ctx.fillStyle = color
    ctx.globalAlpha = opacity //  Set transparency
    ctx.fillRect(screen.x - size / 2, screen.y - size / 2, size, size)
  }

  deferredRenderList.push({
    id: deferredRenderList.length,
    z: calculateZ(point3d),
    renderFn,
  })
}

/**
 * The options accepted by {@link arrow}.
 *
 * Extends the shared shape options with the geometry of the arrow head.
 */
type ArrowShapeOptions = ShapeOptions & {
  /** The radius of the arrow head's base, in pixels. */
  tipRadius: number
  /** The height of the arrow head, in pixels. */
  tipHeight: number
  /** The number of segments used to approximate the arrow head's base. */
  circleSegments?: number
}

/**
 * Draws an arrow from one point to another, with a cone-shaped head.
 *
 * @param point3dA - The world-space position of the arrow's tail.
 * @param point3dB - The world-space position of the arrow's tip.
 * @param options - The shape options, plus the arrow head's radius and height.
 */
export const arrow = (
  point3dA: Vector3d,
  point3dB: Vector3d,
  options: ArrowShapeOptions,
) => {
  const finalOptions = {
    ...DEFAULT_SHAPE_OPTIONS,
    circleSegments: DEFAULT_ARROW_CIRCLE_SEGMENTS,
    ...options,
  }
  const { tipRadius, tipHeight, circleSegments } = finalOptions

  isolateTransformations(() => {
    translate(point3dA)

    const lineAB = point3dB.clone().sub(point3dA)
    const orthogonalAxis = AXES.y.cross(lineAB)
    const yAngle = AXES.y.angleBetween(lineAB)

    // If AB line is already over the Y-axis, no need to rotate.
    if (orthogonalAxis.notEquals(ZERO_VECTOR)) rotate(yAngle, orthogonalAxis)
    else if (lineAB.y < 0) rotateX(PI) // Or `rotateZ(PI)`.

    line(ORIGIN, $v(0, lineAB.mag(), 0), options)

    translate(0, lineAB.mag(), 0)

    rotateX(-HALF_PI)

    cone(tipRadius, tipHeight, {
      ...options,
      nevershowNormals: true,
      circleSegments,
      noStroke: true,
    })
  })
}

/**
 * Draws a line segment between two points.
 *
 * @param point3dA - The world-space position of the first endpoint.
 * @param point3dB - The world-space position of the second endpoint.
 * @param options - The shape options.
 */
export const line = (
  point3dA: Vector3d,
  point3dB: Vector3d,
  options: ShapeOptions = {},
) => {
  const finalOptions = { ...DEFAULT_SHAPE_OPTIONS, ...options }
  const { color, noSplit, lineWidth } = finalOptions

  const screenA = toScreen(point3dA)
  const screenB = toScreen(point3dB)

  // Skip rendering if either point is behind camera.
  if (!screenA || !screenB) return

  const segmentCount = noSplit
    ? 1
    : max(floor(point3dA.dist(point3dB) / MAX_LINE_SEGMENT_SIZE), 1)

  let latestPoint = point3dA

  timesForEach(segmentCount, i => {
    const nextPoint = point3dA.lerp(point3dB, (1 / segmentCount) * (i + 1))
    const center = latestPoint.lerp(nextPoint)

    const latestPointScreenCoords = toScreen(latestPoint)
    const nextPointScreenCoords = toScreen(nextPoint)

    if (!latestPointScreenCoords || !nextPointScreenCoords) return

    const { x: x1, y: y1 } = latestPointScreenCoords
    const { x: x2, y: y2 } = nextPointScreenCoords

    latestPoint = nextPoint

    const renderFn = () => {
      ctx.strokeStyle = color
      ctx.lineWidth = lineWidth
      ctx.beginPath()
      ctx.moveTo(x1, y1)
      ctx.lineTo(x2, y2)
      ctx.stroke()
    }

    deferredRenderList.push({
      id: deferredRenderList.length,
      z: calculateZ(center),
      renderFn,
    })
  })
}

/**
 * Draws a triangle.
 *
 * @param pointA - The world-space position of the first vertex.
 * @param pointB - The world-space position of the second vertex.
 * @param pointC - The world-space position of the third vertex.
 * @param options - The shape options.
 * @param screenCoords - Optional pre-projected screen coordinates, used to
 *   avoid projecting the same vertex twice when a shape is built from
 *   several triangles.
 * @returns The screen coordinates of the three vertices.
 */
export const triangle2d = (
  pointA: Vector3d,
  pointB: Vector3d,
  pointC: Vector3d,
  options: ShapeOptions = {},
  [screenA, screenB, screenC]: [
    screenA?: Vector3d,
    screenB?: Vector3d,
    screenC?: Vector3d,
  ] = [],
) => {
  const finalOptions = { ...DEFAULT_SHAPE_OPTIONS, ...options }
  const {
    opacity,
    color,
    noStroke,
    strokeColor,
    lineWidth,
    isDoubleSided,
    nevershowNormals,
  } = finalOptions

  screenA = screenA ?? toScreen(pointA)
  screenB = screenB ?? toScreen(pointB)
  screenC = screenC ?? toScreen(pointC)

  // Skip rendering if any point is behind camera.
  if (!screenA || !screenB || !screenC) return { screenA, screenB, screenC }

  const renderFn = () => {
    ctx.beginPath() // Start the shape
    ctx.moveTo(screenA.x, screenA.y) // Move to starting point
    ctx.lineTo(screenB.x, screenB.y)
    ctx.lineTo(screenC.x, screenC.y)
    ctx.closePath() // Close path

    ctx.save()
    ctx.globalAlpha = opacity //  Set transparency
    ctx.fillStyle = color // https://developer.mozilla.org/pt-BR/docs/Web/CSS/Reference/Values/color_value

    if (!noStroke) {
      ctx.strokeStyle = strokeColor
      ctx.lineWidth = lineWidth
      ctx.stroke() // Outline the shape
    }

    ctx.fill() // Fill the shape
    ctx.restore()
  }

  const centroid = $v(
    (pointA.x + pointB.x + pointC.x) / 3,
    (pointA.y + pointB.y + pointC.y) / 3,
    (pointA.z + pointB.z + pointC.z) / 3,
  )

  let shapeIsVisible = true

  // https://pt.wikipedia.org/wiki/Back-face_culling
  if (!isDoubleSided && opacity === 1) {
    const vectorAB = pointB.clone().sub(pointA)
    const vectorAC = pointC.clone().sub(pointA)
    const crossProduct = vectorAB.cross(vectorAC)

    // Bypass face culling when line segments AB and AC are perfectly aligned.
    if (crossProduct.equals(ZERO_VECTOR)) return { screenA, screenB, screenC }

    const normal = crossProduct.normalize()

    shapeIsVisible = isShapeFacingCamera(centroid, normal)

    if (showNormals)
      if (shapeIsVisible && !nevershowNormals) {
        arrow(
          centroid,
          centroid.clone().add(normal.clone().mult(NORMAL_CONFIG.length)),
          {
            color: NORMAL_CONFIG.color,
            tipHeight: NORMAL_CONFIG.tip.height,
            tipRadius: NORMAL_CONFIG.tip.radius,
            circleSegments: NORMAL_CONFIG.tip.circleSegments,
            noSplit: true,
          },
        )
      }
  }

  if (shapeIsVisible)
    deferredRenderList.push({
      id: deferredRenderList.length,
      z: calculateZ(centroid),
      renderFn,
    })

  return { screenA, screenB, screenC }
}

/**
 * Tells whether a surface faces the camera.
 *
 * @param center - A point on the surface.
 * @param normal - The surface's normal vector.
 * @returns `true` when the surface is visible from the camera's position.
 */
const isShapeFacingCamera = (center: Vector3d, normal: Vector3d): boolean => {
  const transformed = {
    center: transform(center),
    normal: transformNormal(normal),
  }

  const focalLength = getCurrentFocalLength()
  const camera = $v(0, 0, focalLength)

  const cameraToCenter = transformed.center.sub(camera)

  // Dot product logic remains the same.
  const pointInSameDirection = cameraToCenter.dot(transformed.normal) >= 0

  return !pointInSameDirection
}

// Quadrilateral.
/**
 * Draws a quadrilateral, as two triangles sharing an edge.
 *
 * @param pointA - The world-space position of the first vertex.
 * @param pointB - The world-space position of the second vertex.
 * @param pointC - The world-space position of the third vertex.
 * @param pointD - The world-space position of the fourth vertex.
 * @param options - The shape options.
 */
export const quad = (
  pointA: Vector3d,
  pointB: Vector3d,
  pointC: Vector3d,
  pointD: Vector3d,
  options: ShapeOptions = {},
) => {
  const { screenA, screenC } = triangle2d(pointA, pointB, pointC, options) // Notice `screenB` is not needed.

  if (screenA && screenC)
    triangle2d(pointA, pointC, pointD, options, [screenA, screenC])
}

/**
 * Draws a rectangle centered on the current origin, on the XY-plane.
 *
 * @param width - The rectangle's width, along the X-axis.
 * @param height - The rectangle's height, along the Y-axis.
 * @param options - The shape options.
 */
export const rect2d = (
  width: number, // X-axis
  height: number, // Y-axis
  options: ShapeOptions = {},
) => {
  const point2dA = $v(-width / 2, -height / 2)
  const point2dB = $v(width / 2, -height / 2)
  const point2dC = $v(width / 2, height / 2)
  const point2dD = $v(-width / 2, height / 2)

  quad(point2dA, point2dB, point2dC, point2dD, options)
}

/**
 * Draws a square centered on the current origin, on the XY-plane.
 *
 * @param side - The length of the square's sides.
 * @param options - The shape options.
 */
export const square2d = (side: number, options: ShapeOptions = {}) => {
  rect2d(side, side, options)
}

/**
 * Draws a rectangular box centered on the current origin.
 *
 * @param width - The box's width, along the X-axis.
 * @param height - The box's height, along the Y-axis.
 * @param depth - The box's depth, along the Z-axis.
 * @param options - The shape options.
 */
export const box = (
  width: number, // X-axis
  height: number, // Y-axis
  depth: number, // Z-axis
  options: ShapeOptions = {},
) => {
  // Back face (-z).
  isolateTransformations(() => {
    translate(0, 0, -depth / 2)
    rotateX(PI)

    rect2d(width, height, options)
  })

  // Front face (+z).
  isolateTransformations(() => {
    translate(0, 0, depth / 2)

    rect2d(width, height, options)
  })

  // Left face (-x).
  isolateTransformations(() => {
    translate(-width / 2, 0, 0)
    rotateY(-HALF_PI) // Turn 90ᵒ clockwise.

    rect2d(depth, height, options)
  })

  // Right face (+x).
  isolateTransformations(() => {
    translate(width / 2, 0, 0)
    rotateY(HALF_PI) // Turn 90ᵒ counter-clockwise.

    rect2d(depth, height, options)
  })

  // Bottom face (-y).
  isolateTransformations(() => {
    translate(0, -height / 2, 0)
    rotateX(HALF_PI) // Turn 90ᵒ counter-clockwise.

    rect2d(width, depth, options)
  })

  // Top face (+y).
  isolateTransformations(() => {
    translate(0, height / 2, 0)
    rotateX(-HALF_PI) // Turn 90ᵒ clockwise.

    rect2d(width, depth, options)
  })
}

/**
 * Draws a cube centered on the current origin.
 *
 * @param size - The length of the cube's sides.
 * @param options - The shape options.
 */
export const cube = (size: number, options: ShapeOptions = {}) => {
  box(size, size, size, options)
}

/**
 * The options accepted by {@link sphere}.
 *
 * Extends the shared shape options with the resolution of the surface mesh.
 */
type SphericalShapeOptions = ShapeOptions & {
  /** The number of lines used to approximate the sphere's latitude bands. */
  latitudeLines?: number
  /** The number of lines used to approximate the sphere's longitude bands. */
  longitudeLines?: number
}

/**
 * Draws a sphere centered on the current origin.
 *
 * @param radius - The sphere's radius.
 * @param options - The shape options, plus the number of latitude and
 *   longitude lines used to approximate its surface.
 */
export const sphere = (radius: number, options: SphericalShapeOptions = {}) => {
  const finalOptions = {
    ...DEFAULT_SHAPE_OPTIONS,
    latitudeLines: DEFAULT_SPHERE_LINES.latitude,
    longitudeLines: DEFAULT_SPHERE_LINES.longitude,
    ...options,
  }

  const latSegments = finalOptions.latitudeLines + 1
  const longSegments = finalOptions.longitudeLines

  const getPoint = (latIndex: number, longIndex: number): Vector3d => {
    const latAngle = map(latIndex, 0, latSegments, 0, PI) // [0, PI]
    const longAngle = map(longIndex, 0, longSegments, 0, TWO_PI) // [0, 2*PI]

    const [y, latRadius] = polarToCartesian2d(radius, latAngle)
    const [x, z] = polarToCartesian2d(latRadius, longAngle) // Use RHR Mapping.

    return $v(x, y, z)
  }

  timesForEachN([latSegments, longSegments], (latIndex, longIndex) => {
    if (longIndex / longSegments >= options.percentage!) return

    const p1 = getPoint(latIndex, longIndex)
    const p2 = getPoint(latIndex, longIndex + 1)
    const p3 = getPoint(latIndex + 1, longIndex + 1)
    const p4 = getPoint(latIndex + 1, longIndex)

    quad(p1, p2, p3, p4, options)
  })
}

/**
 * The options accepted by every shape that approximates a circle.
 *
 * Extends the shared shape options with the resolution of the circle.
 */
export type CircularShapeOptions = ShapeOptions & {
  /** The number of segments used to approximate the circle. */
  circleSegments?: number
}

/**
 * Draws a filled circle centered on the current origin, on the XY-plane.
 *
 * @param radius - The circle's radius.
 * @param options - The shape options, plus the number of segments used to
 *   approximate the circle.
 */
export const circle2d = (
  radius: number, // XY-plane
  options: CircularShapeOptions = {},
) => {
  const finalOptions = {
    ...DEFAULT_SHAPE_OPTIONS,
    circleSegments: DEFAULT_CIRCLE_SEGMENTS,
    ...options,
  }
  const { circleSegments } = finalOptions

  const step = TWO_PI / circleSegments
  const originScreenCoords: Vector3d | undefined = toScreen(ORIGIN)

  for (let i = 0; i < circleSegments; i++) {
    const theta = i * step

    const p1 = polarToCartesian2d(radius, theta)
    const p2 = polarToCartesian2d(radius, theta + step)

    // Form a slice by connecting the two points on the perimeter to the circle center (origin).
    triangle2d(ORIGIN, p1, p2, options, [originScreenCoords])
  }
}

/**
 * Draws the outline of a circle centered on the current origin, on the
 * XY-plane.
 *
 * @param radius - The circle's radius.
 * @param options - The shape options, plus the number of segments used to
 *   approximate the circle.
 */
export const circlePerimeter2d = (
  radius: number, // XY-plane
  options: CircularShapeOptions = {},
) => {
  const finalOptions = {
    ...DEFAULT_SHAPE_OPTIONS,
    circleSegments: DEFAULT_CIRCLE_SEGMENTS,
    ...options,
  }
  const { circleSegments } = finalOptions

  const step = TWO_PI / circleSegments

  for (let i = 0; i < circleSegments; i++) {
    const theta = i * step

    const p1 = polarToCartesian2d(radius, theta)
    const p2 = polarToCartesian2d(radius, theta + step)

    line(p1, p2, options)
  }
}

// [/doc_img/primitives.ts/2026-07-03-11-36-30.png]
/**
 * Draws a hollow ring (a tube) centered on the current origin, extending
 * along the Z-axis.
 *
 * @param radius - The ring's outer radius, on the XY-plane.
 * @param depth - The ring's length, along the Z-axis.
 * @param options - The shape options, plus the number of segments used to
 *   approximate the ring.
 */
export const ring = (
  radius: number, // XY-plane
  depth: number, // Z-axis
  options: CircularShapeOptions = {},
) => {
  const finalOptions = {
    ...DEFAULT_SHAPE_OPTIONS,
    circleSegments: DEFAULT_CIRCLE_SEGMENTS,
    ...options,
  }
  const { circleSegments } = finalOptions

  const step = TWO_PI / circleSegments

  isolateTransformations(() => {
    translate(0, 0, -depth / 2)

    for (let i = 0; i < circleSegments; i++) {
      const theta = i * step

      const p1 = polarToCartesian2d(radius, theta)
      const p2 = polarToCartesian2d(radius, theta + step)
      const p3 = p2.clone().setZ(depth)
      const p4 = p1.clone().setZ(depth)

      quad(p1, p2, p3, p4, options)
    }
  })
}

// [/doc_img/primitives.ts/2026-07-23-12-29-52.png]
/**
 * Draws a flat annular ring centered on the current origin, on the XY-plane.
 *
 * @param internalRadius - The ring's inner radius, on the XY-plane.
 * @param externalRadius - The ring's outer radius, on the XY-plane.
 * @param options - The shape options, plus the number of segments used to
 *   approximate the ring.
 */
export const saturnRing = (
  internalRadius: number, // XY-plane
  externalRadius: number, // XY-plane
  options: CircularShapeOptions = {},
) => {
  const finalOptions = {
    ...DEFAULT_SHAPE_OPTIONS,
    circleSegments: DEFAULT_CIRCLE_SEGMENTS,
    ...options,
  }
  const { circleSegments } = finalOptions

  const step = TWO_PI / circleSegments

  for (let i = 0; i < circleSegments; i++) {
    const theta = i * step

    const p1 = polarToCartesian2d(internalRadius, theta)
    const p2 = polarToCartesian2d(internalRadius, theta + step)
    const p3 = polarToCartesian2d(externalRadius, theta)
    const p4 = polarToCartesian2d(externalRadius, theta + step)

    quad(p1, p2, p4, p3, { ...options, isDoubleSided: true })
  }
}

// [/doc_img/primitives.ts/2026-07-19-15-40-03.png]
/**
 * Draws a wedge shaped like a slice of a spherical shell, centered on the
 * current origin.
 *
 * @param radius - The slice's radius, on the XY-plane.
 * @param depth - The slice's height, along the Z-axis.
 * @param options - The shape options, plus the number of segments used to
 *   approximate the slice.
 */
export const sphericalCheeseSlice = (
  radius: number, // XY-plane
  depth: number, // Z-axis
  options: CircularShapeOptions = {},
) => {
  const finalOptions = {
    ...DEFAULT_SHAPE_OPTIONS,
    circleSegments: DEFAULT_CIRCLE_SEGMENTS,
    ...options,
  }
  const { circleSegments } = finalOptions

  const step = TWO_PI / circleSegments

  for (let i = 0; i < circleSegments; i++) {
    const theta = i * step
    const avgX = polarToCartesian2d(radius, theta + step / 2).x
    const z = map(avgX, -radius, radius, depth, 0, true)

    const p1 = polarToCartesian2d(radius, theta)
    const p2 = polarToCartesian2d(radius, theta + step)
    const p3 = p2.clone().setZ(z)
    const p4 = p1.clone().setZ(z)

    quad(p1, p2, p3, p4, options)
  }
}

/**
 * Draws a torus centered on the current origin.
 *
 * @param internalRadius - The distance from the center to the middle of the
 *   tube, on the XY-plane.
 * @param tubeRadius - The radius of the tube, on the XY-plane.
 * @param torusCircleSegments - The number of segments used to approximate the
 *   torus.
 * @param options - The shape options, plus the number of segments used to
 *   approximate each ring.
 */
export const torus = (
  internalRadius: number, // XY-plane
  tubeRadius: number, // XY-plane
  torusCircleSegments: number,
  options: CircularShapeOptions = {},
) => {
  const step = TWO_PI / torusCircleSegments
  const p1 = polarToCartesian2d(internalRadius + 2 * tubeRadius, 0)
  const p2 = polarToCartesian2d(internalRadius + 2 * tubeRadius, step)
  const tubeRingDepth = p1.dist(p2)

  for (let i = 0; i < torusCircleSegments; i++) {
    const theta = i * step

    isolateTransformations(() => {
      translate(polarToCartesian2d(internalRadius + tubeRadius, theta))
      rotate(HALF_PI, polarToCartesian2d(1, theta))

      ring(tubeRadius, tubeRingDepth, options)
    })
  }
}

/**
 * Draws a cone centered on the current origin, pointing along the Z-axis.
 *
 * @param radius - The cone's base radius, on the XY-plane.
 * @param depth - The cone's height, along the Z-axis.
 * @param options - The shape options, plus the number of segments used to
 *   approximate the cone.
 */
export const cone = (
  radius: number, // XY-plane
  depth: number, // Z-axis.
  options: CircularShapeOptions = {},
) => {
  const finalOptions = {
    ...DEFAULT_SHAPE_OPTIONS,
    circleSegments: DEFAULT_CIRCLE_SEGMENTS,
    ...options,
  }
  const { circleSegments } = finalOptions

  const step = TWO_PI / circleSegments
  const tip = $v(0, 0, depth / 2)
  const backCenter = $v(0, 0, -depth / 2)

  for (let i = 0; i < circleSegments; i++) {
    const theta = i * step

    const p1 = polarToCartesian2d(radius, theta).setZ(-depth / 2)
    const p2 = polarToCartesian2d(radius, theta + step).setZ(-depth / 2)

    // Form 2 slices, one connecting the above two points on the perimeter to the tip and
    // another to the back center.
    const { screenA: p2ScreenCoords, screenB: p1ScreenCoords } = triangle2d(
      p2,
      p1,
      backCenter,
      options,
    )

    if (p1ScreenCoords && p2ScreenCoords)
      triangle2d(p1, p2, tip, options, [p1ScreenCoords, p2ScreenCoords])
  }
}

/**
 * Draws a cylinder centered on the current origin, extending along the Z-axis.
 *
 * @param radius - The cylinder's radius, on the XY-plane.
 * @param depth - The cylinder's length, along the Z-axis.
 * @param options - The shape options, plus the number of segments used to
 *   approximate the cylinder.
 */
export const cylinder = (
  radius: number, // XY-plane
  depth: number, // Z-axis.
  options: CircularShapeOptions = {},
) => {
  const finalOptions = {
    ...DEFAULT_SHAPE_OPTIONS,
    circleSegments: DEFAULT_CIRCLE_SEGMENTS,
    ...options,
  }
  const { circleSegments } = finalOptions

  const step = TWO_PI / circleSegments
  const backCenter = $v(0, 0, -depth / 2)
  const frontCenter = $v(0, 0, depth / 2)

  for (let i = 0; i < circleSegments; i++) {
    if (i / circleSegments >= options.percentage!) return

    const theta = i * step

    const p1 = polarToCartesian2d(radius, theta).setZ(-depth / 2)
    const p2 = polarToCartesian2d(radius, theta + step).setZ(-depth / 2)
    const upperP1 = p1.clone().add(0, 0, depth)
    const upperP2 = p2.clone().add(0, 0, depth)

    quad(p1, p2, upperP2, upperP1, options)

    triangle2d(p2, p1, backCenter, options)
    triangle2d(upperP1, upperP2, frontCenter, options)
  }
}

/**
 * Draws a text label in the scene.
 *
 * @param message - The text to draw.
 * @param point - The world-space position of the text.
 * @param color - The color of the text. Defaults to `'red'`.
 * @param options - The typographic options.
 * @param options.fontSize - The font size, in pixels. Defaults to `60`.
 * @param options.fontFamily - The font family. Defaults to `'sans-serif'`.
 * @param options.fontWeight - The font weight. Defaults to `'bold'`.
 * @param options.textAlign - The horizontal alignment. Defaults to `'center'`.
 * @param options.textBaseline - The vertical alignment. Defaults to `'middle'`.
 */
export const text2d = (
  message: string,
  point: Vector3d,
  color = 'red',
  {
    fontSize = 60,
    fontFamily = 'sans-serif',
    fontWeight = 'bold',
    textAlign = 'center',
    textBaseline = 'middle',
  }: {
    fontSize?: number
    fontFamily?: string
    fontWeight?: string
    textAlign?: CanvasTextAlign
    textBaseline?: CanvasTextBaseline
  } = {},
) => {
  ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`
  ctx.fillStyle = color
  ctx.textAlign = textAlign
  ctx.textBaseline = textBaseline

  const position = transform(point).clone().add(getScreenCenter())

  ctx.fillText(message, position.x, position.y)
}

/**
 * Draws the coordinate axes, as three colored arrows.
 *
 * @param length - The total length of the axes. Defaults to a value derived
 *   from the canvas size.
 */
export const render3dAxes = (length?: number) => {
  if (!render3dAxesEnabled) return

  const halfLength = (length ?? getAxisLength()) / 2

  arrow(AXES['-x'].clone().mult(halfLength), AXES.x.clone().mult(halfLength), {
    color: 'red',
    tipRadius: 5,
    tipHeight: 10,
    circleSegments: 15,
  })

  arrow(AXES['-y'].clone().mult(halfLength), AXES.y.clone().mult(halfLength), {
    color: 'green',
    tipRadius: 5,
    tipHeight: 10,
    circleSegments: 15,
  })

  arrow(AXES['-z'].clone().mult(halfLength), AXES.z.clone().mult(halfLength), {
    color: 'blue',
    tipRadius: 5,
    tipHeight: 10,
    circleSegments: 15,
  })
}

/**
 * Returns the depth of a point along the camera axis.
 *
 * @param point3d - The world-space point.
 * @returns The point's depth, used to order the scene.
 */
const calculateZ = (point3d: Vector3d): number => {
  const [tm20, tm21, tm22, tm23] = transformationMatrix[2] // 3rd row.
  const { x, y, z } = point3d

  return tm20 * x + tm21 * y + tm22 * z + tm23 * FOURTH_DIMENSION_COORD
}
