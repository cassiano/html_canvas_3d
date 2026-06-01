import {
  CIRCLE_SEGMENTS,
  LINE_SEGMENTS,
  FOCAL_LENGTH,
  Z_EPSILON,
} from './constants.ts'
import {
  $v,
  AXES,
  FOURTH_DIMENSION_COORD,
  transformationMatrix4x1Type,
  Vector3d,
} from './vector_3d.ts'
import { Tuple } from './utility_types.ts'
import { timesForEach, timesForEachN } from './utils.ts'
import { abs, cos, min, PI, sin, multiplyMatrices } from './math_utils.ts'
import {
  NORMAL_CONFIG,
  ARROW_DEFAULT_CIRCLE_SEGMENTS,
  SPHERE_LINES,
} from './constants.ts'
import { ORIGIN, ELBOW_CIRCLE_SLICES } from './constants.ts'

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
  noSplit?: boolean // Used for lines.
  isDoubleSided?: boolean
  neverRenderNormals?: boolean
  sphereAmount?: number // Used for spheres.
}

const DEFAULT_SHAPE_OPTIONS: Required<ShapeOptions> = {
  color: 'gray',
  lineWidth: 1,
  opacity: 1,
  strokeColor: 'black',
  noStroke: false,
  size: 1,
  noSplit: false,
  isDoubleSided: false,
  neverRenderNormals: false,
  sphereAmount: 1.0,
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

const AXIS_LENGTH = min(animation.width, animation.height) * 0.65

export let renderNormals = false

export const setRenderNormals = (value: boolean) => {
  renderNormals = value
}

export type transformationMatrix4x4Type = Tuple<Tuple<number, 4>, 4>

export const DEFAULT_TRANSFORMATION_MATRIX: transformationMatrix4x4Type =
  // Use ĵ as [0, -1, 0, 0] so the Y-axis in completely inverted, pointing up.
  // prettier-ignore
  [
  //  ȋ   ĵ   k̂  4d
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

    transformationMatrix = multiplyMatrices(
      transformationMatrix,
      // prettier-ignore
      [
      //  ȋ  ĵ  k̂ 4d
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
  (x: number, y: number, z: number): void
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

    transformationMatrix = multiplyMatrices(
      transformationMatrix,
      // prettier-ignore
      [
      //  ȋ  ĵ  k̂ 4d
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

  transformationMatrix = multiplyMatrices(
    transformationMatrix,
    // prettier-ignore
    [
    //        ȋ               ĵ                k̂         4d
    //  --------------  --------------  ---------------  --
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

  transformationMatrix = multiplyMatrices(
    transformationMatrix,
    // prettier-ignore
    [
    //  ȋ   ĵ   k̂  4d
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
  transformationMatrix = multiplyMatrices(
    transformationMatrix,
    // prettier-ignore
    [
    //   ȋ   ĵ   k̂  4d
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

  transformationMatrix = multiplyMatrices(
    transformationMatrix,
    // prettier-ignore
    [
    //  ȋ   ĵ   k̂  4d
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
  return $v((x * FOCAL_LENGTH) / divisor, (y * FOCAL_LENGTH) / divisor, 0)
}

// https://aistudio.google.com/app/prompts?state=%7B%22ids%22:%5B%2218pwbUVcOk6C_ICb7JXo82YBAFzJMpz_a%22%5D,%22action%22:%22open%22,%22userId%22:%22113757018662815530084%22,%22resourceKeys%22:%7B%7D%7D&usp=sharing
export const centralize = (point?: Vector3d) =>
  point?.clone().add(SCREEN_CENTER).add(panOffset)

export const transform = (point: Vector3d, { isNormal = false } = {}) => {
  const pointAs4dMatrix = point.to4dMatrix()

  if (isNormal) pointAs4dMatrix[3][0] = 0 // Ignore the 4th dimension (used for translations) when transforming normals.

  // Notice that a 4x4 matrix multiplied by a 4x1 vector results in another 4x1 vector.
  // Also notice that we use Post-multiplication. See https://aistudio.google.com/app/prompts?state=%7B%22ids%22:%5B%221k6P5M79qGEqAjs7Wp_-21Jqwgzl8_Z6l%22%5D,%22action%22:%22open%22,%22userId%22:%22113757018662815530084%22,%22resourceKeys%22:%7B%7D%7D&usp=sharing
  const transformedPoint = multiplyMatrices(
    transformationMatrix,
    pointAs4dMatrix,
  ) as transformationMatrix4x4Type

  return Vector3d.from4dMatrix(
    transformedPoint as unknown as transformationMatrix4x1Type,
  )
}

const toScreen = (point: Vector3d) =>
  centralize(project3dTo2d(transform(point)))!

export const point = (point3d: Vector3d, options: ShapeOptions = {}) => {
  const finalOptions = { ...DEFAULT_SHAPE_OPTIONS, ...options }
  const { color, size } = finalOptions

  const screen = toScreen(point3d)

  // Skip rendering if point is behind camera.
  if (!screen) return

  const renderFn = () => {
    ctx.fillStyle = color
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
    circleSegments: ARROW_DEFAULT_CIRCLE_SEGMENTS,
    ...options,
  }
  const { tipRadius, tipHeight, circleSegments } = finalOptions

  isolateTransformations(() => {
    translate(point3dA)

    const lineAB = point3dB.clone().sub(point3dA)
    const orthogonalAxis = AXES.y.cross(lineAB)
    const yAngle = AXES.y.angleBetween(lineAB)

    // If AB line is already over the Y-axis, no need to rotate.
    if (!orthogonalAxis.equals(ORIGIN)) rotate(yAngle, orthogonalAxis)
    else if (lineAB.y < 0) rotateX(PI) // Or `rotateZ(PI)`.

    line(ORIGIN, $v(0, lineAB.mag(), 0), options)

    translate(0, lineAB.mag(), 0)

    rotateX(PI)

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

  if (noSplit) {
    const center = point3dA.lerp(point3dB)

    const renderFn = () => {
      ctx.strokeStyle = color
      ctx.lineWidth = lineWidth
      ctx.beginPath()
      ctx.moveTo(screenA.x, screenA.y)
      ctx.lineTo(screenB.x, screenB.y)
      ctx.stroke()
    }

    deferredRenderList.push({
      id: deferredRenderList.length,
      z: calculateZ(center),
      renderFn,
    })
  } else {
    let latestPoint = point3dA

    timesForEach(LINE_SEGMENTS, i => {
      const nextPoint = point3dA.lerp(point3dB, (1 / LINE_SEGMENTS) * (i + 1))
      const center = latestPoint.lerp(nextPoint)

      const { x: x1, y: y1 } = toScreen(latestPoint)
      const { x: x2, y: y2 } = toScreen(nextPoint)

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
}

export const triangle2d = (
  pointA: Vector3d,
  pointB: Vector3d,
  pointC: Vector3d,
  options: ShapeOptions = {},
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

  const screenA = toScreen(pointA)
  const screenB = toScreen(pointB)
  const screenC = toScreen(pointC)

  // Skip rendering if any point is behind camera.
  if (!screenA || !screenB || !screenC) return

  // if (point2dB.dist(point2dC) > 30) {
  //   const middlePointBC = point2dB.lerp(point2dC)

  //   triangle2d(point2dB, middlePointBC, point2dA, options)
  //   triangle2d(middlePointBC, point2dC, point2dA, options)

  //   return
  // }

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
    if (crossProduct.equals(ORIGIN)) return

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
}

const isShapeFacingCamera = (center: Vector3d, normal: Vector3d): boolean => {
  const transformed = {
    center: transform(center),
    normal: transform(normal, { isNormal: true }),
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
  triangle2d(pointA, pointB, pointC, options)
  triangle2d(pointA, pointC, pointD, options)
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
    rotateY(-PI / 2) // Turn 90ᵒ clockwise.

    rect2d(depth, height, options)
  })

  // Right face (+x).
  isolateTransformations(() => {
    translate(width / 2, 0, 0)
    rotateY(PI / 2) // Turn 90ᵒ counter-clockwise.

    rect2d(depth, height, options)
  })

  // Bottom face (-y).
  isolateTransformations(() => {
    translate(0, -height / 2, 0)
    rotateX(PI / 2) // Turn 90ᵒ counter-clockwise.

    rect2d(width, depth, options)
  })

  // Top face (+y).
  isolateTransformations(() => {
    translate(0, height / 2, 0)
    rotateX(-PI / 2) // Turn 90ᵒ clockwise.

    rect2d(width, depth, options)
  })
}

export const cube = (size: number, options: ShapeOptions = {}) => {
  box(size, size, size, options)
}

export const sphere = (radius: number, options: ShapeOptions = {}) => {
  const longSegments = SPHERE_LINES.longitude
  const latSegments = SPHERE_LINES.latitude + 1

  const getPoint = (latIndex: number, longIndex: number): Vector3d => {
    const latAngle = (latIndex / latSegments) * PI // [0, PI]
    const longAngle = (longIndex / longSegments) * 2 * PI // [0, 2.PI]

    // RHR Mapping:
    return $v(
      sin(latAngle) * cos(longAngle),
      cos(latAngle),
      sin(latAngle) * sin(longAngle),
    ).mult(radius)
  }

  timesForEachN([latSegments, longSegments], (latIndex, longIndex) => {
    if (longIndex / longSegments >= options.sphereAmount!) return

    const p1 = getPoint(latIndex, longIndex)
    const p2 = getPoint(latIndex, longIndex + 1)
    const p3 = getPoint(latIndex + 1, longIndex + 1)
    const p4 = getPoint(latIndex + 1, longIndex)

    quad(p1, p2, p3, p4, options)
  })
}

type CircularShapeOptions = ShapeOptions & { circleSegments?: number }

export const circle2d = (
  radius: number,
  options: CircularShapeOptions = {},
) => {
  const finalOptions = {
    ...DEFAULT_SHAPE_OPTIONS,
    circleSegments: CIRCLE_SEGMENTS,
    ...options,
  }
  const { circleSegments } = finalOptions

  const step = (2 * PI) / circleSegments

  for (let i = 0; i < circleSegments; i++) {
    const theta1 = i * step
    const theta2 = (i + 1) * step

    const p1 = $v(radius * cos(theta1), radius * sin(theta1))
    const p2 = $v(radius * cos(theta2), radius * sin(theta2))

    // Form a slice by connecting the two points on the perimeter to the circle center (origin).
    triangle2d(ORIGIN, p1, p2, options)
  }
}

export const ring = (
  radius: number,
  height: number,
  options: CircularShapeOptions = {},
) => {
  const finalOptions = {
    ...DEFAULT_SHAPE_OPTIONS,
    circleSegments: CIRCLE_SEGMENTS,
    ...options,
  }
  const { circleSegments } = finalOptions

  const step = (2 * PI) / circleSegments

  translate(0, 0, -height / 2)

  for (let i = 0; i < circleSegments; i++) {
    const theta1 = i * step
    const theta2 = (i + 1) * step

    const p1 = $v(radius * cos(theta1), radius * sin(theta1), 0)
    const p2 = $v(radius * cos(theta2), radius * sin(theta2), 0)
    const p3 = $v(radius * cos(theta2), radius * sin(theta2), height)
    const p4 = $v(radius * cos(theta1), radius * sin(theta1), height)

    quad(p1, p2, p3, p4, options)
  }
}

export const cone = (
  radius: number, // XZ-plane
  height: number, // Y-axis.
  options: CircularShapeOptions = {},
) => {
  const finalOptions = {
    ...DEFAULT_SHAPE_OPTIONS,
    circleSegments: CIRCLE_SEGMENTS,
    ...options,
  }
  const { circleSegments } = finalOptions

  const step = (2 * PI) / circleSegments
  const tip = $v(0, -height / 2, 0)
  const upperCenter = $v(0, height / 2, 0)

  for (let i = 0; i < circleSegments; i++) {
    const theta1 = i * step
    const theta2 = (i + 1) * step

    // Notice that in a Right-Handed Rule (RHR) System, Z precedes X. This explains X using sine
    // and Z using cosine.
    const p1 = $v(radius * sin(theta1), height / 2, radius * cos(theta1))
    const p2 = $v(radius * sin(theta2), height / 2, radius * cos(theta2))

    // Form 2 slices, one connecting the above two points on the perimeter to the tip and
    // another to the upper center.
    triangle2d(p1, p2, upperCenter, options)
    triangle2d(p2, p1, tip, options)
  }
}

export const cylinder = (
  radius: number, // XZ-plane
  height: number, // Y-axis.
  options: CircularShapeOptions = {},
) => {
  const finalOptions = {
    ...DEFAULT_SHAPE_OPTIONS,
    circleSegments: CIRCLE_SEGMENTS,
    ...options,
  }
  const { circleSegments } = finalOptions

  const step = (2 * PI) / circleSegments
  const lowerCenter = $v(0, -height / 2, 0)
  const upperCenter = $v(0, height / 2, 0)

  for (let i = 0; i < circleSegments; i++) {
    const theta1 = i * step
    const theta2 = (i + 1) * step

    // Notice that in a Right-Handed Rule (RHR) System, Z precedes X. This explains X using sine
    // and Z using cosine.
    const p1 = $v(radius * sin(theta1), -height / 2, radius * cos(theta1))
    const p2 = $v(radius * sin(theta2), -height / 2, radius * cos(theta2))
    const upperP1 = p1.clone().add(0, height, 0)
    const upperP2 = p2.clone().add(0, height, 0)

    quad(p1, p2, upperP2, upperP1, options)

    triangle2d(p2, p1, lowerCenter, options)
    triangle2d(upperP1, upperP2, upperCenter, options)
  }
}

export const elbow = (radius: number, options: CircularShapeOptions = {}) => {
  const ringHeight = (2 * PI * radius) / 4 / ELBOW_CIRCLE_SLICES // (2.π.R)/4 = 1/4 of circle perimeter.

  for (let theta = 0; theta < PI / 2; theta += PI / 2 / ELBOW_CIRCLE_SLICES) {
    isolateTransformations(() => {
      translate(radius / 2, 0, 0)
      rotateZ(-theta)
      translate(-radius / 2, ringHeight / 2, 0)
      rotateX(-PI / 2)

      ring(radius / 2, ringHeight, options)
    })
  }
}

export const text2d = (message: string, point: Vector3d) => {
  ctx.font = 'bold 60px sans-serif'
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)' // Semi-transparent black
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  const position = transform(point).clone().add(SCREEN_CENTER)

  ctx.fillText(message, position.x, position.y)
}

export const render3dAxes = () => {
  const halfLength = AXIS_LENGTH / 2

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
  const thirdRow = transformationMatrix[2]

  return (
    thirdRow[0] * point3d.x +
    thirdRow[1] * point3d.y +
    thirdRow[2] * point3d.z +
    thirdRow[3] * FOURTH_DIMENSION_COORD
  )
}
