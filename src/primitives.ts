import {
  DEFAULT_CIRCLE_SEGMENTS,
  FOCAL_LENGTH,
  Z_EPSILON,
  AXES,
  MIN_LINE_SEGMENT_SIZE,
  ZERO_VECTOR,
} from './constants.ts'
import { $v, Vector3d } from './vector_3d.ts'
import { Tuple } from './utility_types.ts'
import { timesForEach, timesForEachN } from './utils.ts'
import {
  abs,
  cos,
  min,
  max,
  PI,
  sin,
  multiply4x4Matrices,
  multiply4x4MatrixBy4dPoint,
  floor,
} from './math_utils.ts'
import {
  NORMAL_CONFIG,
  DEFAULT_ARROW_CIRCLE_SEGMENTS,
  DEFAULT_SPHERE_LINES,
} from './constants.ts'
import { ORIGIN } from './constants.ts'
import { TWO_PI, HALF_PI, polarToCartesian2d, map } from './math_utils.ts'

const FOURTH_DIMENSION_COORD = 1

export const animation = document.getElementById(
  'animation',
) as HTMLCanvasElement

export const ctx = animation.getContext('2d')!

export interface ShapeOptions {
  color?: string | CanvasGradient | CanvasPattern
  lineWidth?: number
  opacity?: number
  strokeColor?: string | CanvasGradient | CanvasPattern
  noStroke?: boolean
  size?: number
  noSplit?: boolean // Used for lines and arrows.
  isDoubleSided?: boolean
  neverRenderNormals?: boolean
  percentage?: number
}

export const DEFAULT_SHAPE_OPTIONS: Required<ShapeOptions> = {
  color: 'gray',
  lineWidth: 1,
  opacity: 1,
  strokeColor: 'black',
  noStroke: false,
  size: 1,
  noSplit: false,
  isDoubleSided: false,
  neverRenderNormals: false,
  percentage: 1.0,
}

const deferredRenderList: {
  id: number
  z: number
  renderFn: () => void
}[] = []

// https://en.wikipedia.org/wiki/Painter%27s_algorithm
export const render3dScene = () => {
  const orderedList = deferredRenderList.toSorted((left, right) =>
    abs(left.z - right.z) < Z_EPSILON ? left.id - right.id : left.z - right.z,
  )

  orderedList.forEach(element => element.renderFn())

  deferredRenderList.length = 0
}

export const SCREEN_CENTER = $v(animation.width / 2, animation.height / 2, 0)

const getScreenCenter = () => $v(animation.width / 2, animation.height / 2, 0)

const getAxisLength = () => min(animation.width, animation.height) * 0.6

export let renderNormals = false

export const setRenderNormals = (value: boolean) => {
  renderNormals = value
}

export type transformationMatrix4x4Type = Tuple<Tuple<number, 4>, 4>

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

export const setDragRotation = (x: number, y: number) => {
  dragRotation.x = x
  dragRotation.y = y
}

export const addDragRotation = (x: number, y: number) => {
  dragRotation.add(x, y)
}

export const resetDragRotation = () => setDragRotation(0, 0)

export const setZoom = (z: number) => {
  zoomLevel = z
}

export const addZoom = (delta: number) => {
  zoomLevel += delta
}

export const resetZoom = () => setZoom(1)

export const setPanOffset = (x: number, y: number) => {
  panOffset.x = x
  panOffset.y = y
}

export const addPanOffset = (x: number, y: number) => {
  panOffset.add(x, y)
}

export const resetPanOffset = () => setPanOffset(0, 0)

export const resetTransformationMatrix = () => {
  transformationMatrix = cloneTransformationMatrix(
    DEFAULT_TRANSFORMATION_MATRIX,
  )

  scale(zoomLevel)
  rotateY(dragRotation.y)
  rotateX(dragRotation.x)
}

export const push = () => {
  transformatioMatrixStack.push(cloneTransformationMatrix(transformationMatrix))
}

export const pop = () => {
  const matrix = transformatioMatrixStack.pop()

  if (matrix === undefined) throw new Error('Empty transformation matrix stack')

  transformationMatrix = matrix
}

export const pushMatrix = push // Synonym for `push()`, as used by Processing.
export const popMatrix = pop // Synonym for `pop()`, as used by Processing.

export const isolateTransformations = (fn: () => void) => {
  push()
  fn()
  pop()
}

export const restoreCoordinateSystem = isolateTransformations // Synonym for `isolateTransformations()`.

interface ScaleOverloadedSignatures {
  (x: number, y: number, z: number): void
  (xyz: number): void
  (vector: Vector3d): void
}

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

export const background = (color: string) => {
  ctx.fillStyle = color
  ctx.fillRect(0, 0, animation.width, animation.height)
}

export const project3dTo2d = ({ x, y, z }: Vector3d) => {
  // If z = FOCAL_LENGTH, the point is on the lens.
  // If z > FOCAL_LENGTH, the point is behind the camera.
  const divisor = FOCAL_LENGTH - z // Object should be at z=0 or lower.

  // If the point is behind the camera or exactly on the lens, we return `undefined` so the
  // renderer knows to skip it.
  if (divisor <= 0) return

  // Standard perspective: (coord * FOCAL_LENGTH) / (z + FOCAL_LENGTH).
  return $v((x * FOCAL_LENGTH) / divisor, (y * FOCAL_LENGTH) / divisor)
}

// https://aistudio.google.com/app/prompts?state=%7B%22ids%22:%5B%2218pwbUVcOk6C_ICb7JXo82YBAFzJMpz_a%22%5D,%22action%22:%22open%22,%22userId%22:%22113757018662815530084%22,%22resourceKeys%22:%7B%7D%7D&usp=sharing
export const centralize = (point?: Vector3d) =>
  point?.clone().add(getScreenCenter()).add(panOffset)

// Standard version.
// export const transform = (point: Vector3d, { isNormal = false } = {}) => {
//   const pointAs4dMatrix = point.to4dMatrix()
//
//   if (isNormal) pointAs4dMatrix[3][0] = 0 // Ignore the 4th dimension (used for translations) when transforming normals.
//
//   // Notice that a 4x4 matrix multiplied by a 4x1 vector results in another 4x1 vector.
//   // Also notice that we use Post-multiplication. See https://aistudio.google.com/app/prompts?state=%7B%22ids%22:%5B%221k6P5M79qGEqAjs7Wp_-21Jqwgzl8_Z6l%22%5D,%22action%22:%22open%22,%22userId%22:%22113757018662815530084%22,%22resourceKeys%22:%7B%7D%7D&usp=sharing
//   const transformedPoint = multiplyMatrices(
//     transformationMatrix,
//     pointAs4dMatrix,
//   ) as transformationMatrix4x4Type
//
//   return Vector3d.from4dMatrix(
//     transformedPoint as unknown as transformationMatrix4x1Type,
//   )
// }

// Optimized versions.
export const transform = (point: Vector3d) =>
  multiply4x4MatrixBy4dPoint(transformationMatrix, [
    point.x,
    point.y,
    point.z,
    FOURTH_DIMENSION_COORD,
  ])

// https://aistudio.google.com/app/prompts?state=%7B%22ids%22:%5B%221bVRsjpez2q3HdcsuDn1nKKO_de1Zmyly%22%5D,%22action%22:%22open%22,%22userId%22:%22113757018662815530084%22,%22resourceKeys%22:%7B%7D%7D&usp=sharing, https://drive.google.com/file/d/1bvI7QTO-_Yvs8iV2MDNuaO-NVDi9NYnq/view?usp=sharing
export const transformNormal = (point: Vector3d) =>
  multiply4x4MatrixBy4dPoint(transformationMatrix, [
    point.x,
    point.y,
    point.z,
    0,
  ])

const toScreen = (point: Vector3d) =>
  centralize(project3dTo2d(transform(point)))

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

type ArrowShapeOptions = ShapeOptions & {
  tipRadius: number
  tipHeight: number
  circleSegments?: number
}

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
    if (!orthogonalAxis.equals(ZERO_VECTOR)) rotate(yAngle, orthogonalAxis)
    else if (lineAB.y < 0) rotateX(PI) // Or `rotateZ(PI)`.

    line(ORIGIN, $v(0, lineAB.mag(), 0), options)

    translate(0, lineAB.mag(), 0)

    rotateX(-HALF_PI)

    cone(tipRadius, tipHeight, {
      ...options,
      neverRenderNormals: true,
      circleSegments,
      noStroke: true,
    })
  })
}

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
    : max(floor(point3dA.dist(point3dB) / MIN_LINE_SEGMENT_SIZE), 1)

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
    neverRenderNormals,
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

    if (renderNormals)
      if (shapeIsVisible && !neverRenderNormals) {
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

const isShapeFacingCamera = (center: Vector3d, normal: Vector3d): boolean => {
  const transformed = {
    center: transform(center),
    normal: transformNormal(normal),
  }
  const camera = $v(0, 0, FOCAL_LENGTH)
  const cameraToCenter = transformed.center.sub(camera)

  // If the vector from camera to (center of) object and the surface normal point
  // in opposite directions (dot < 0), the face is visible.
  const pointInSameDirection = cameraToCenter.dot(transformed.normal) >= 0

  return !pointInSameDirection
}

// Quadrilateral.
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

export const square2d = (side: number, options: ShapeOptions = {}) => {
  rect2d(side, side, options)
}

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

export const cube = (size: number, options: ShapeOptions = {}) => {
  box(size, size, size, options)
}

type SphericalShapeOptions = ShapeOptions & {
  latitudeLines?: number
  longitudeLines?: number
}

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

export type CircularShapeOptions = ShapeOptions & { circleSegments?: number }

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

  for (let angle = 0; angle < TWO_PI; angle += step) {
    isolateTransformations(() => {
      translate(polarToCartesian2d(internalRadius + tubeRadius, angle))
      rotate(HALF_PI, polarToCartesian2d(1, angle))

      ring(tubeRadius, tubeRingDepth, options)
    })
  }
}

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

export const text2d = (message: string, point: Vector3d) => {
  ctx.font = 'bold 60px sans-serif'
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)' // Semi-transparent black
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  const position = transform(point).clone().add(getScreenCenter())

  ctx.fillText(message, position.x, position.y)
}

export const render3dAxes = () => {
  const halfLength = getAxisLength() / 2

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

const calculateZ = (point3d: Vector3d): number => {
  const [tm20, tm21, tm22, tm23] = transformationMatrix[2] // 3rd row.
  const { x, y, z } = point3d

  return tm20 * x + tm21 * y + tm22 * z + tm23 * FOURTH_DIMENSION_COORD
}
