///////////////////////
// AI-generated code //
///////////////////////

import { FPS, ORIGIN } from '../constants.ts'
import { createFrameLoop, millis, timesForEach } from '../utils.ts'
import {
  background,
  render3dScene,
  render3dAxes,
  resetTransformationMatrix,
  text2d,
  sphere,
  ring,
  circle2d,
  point,
  cube,
  square2d,
  box,
  translate,
  rotateX,
  rotateY,
  isolateTransformations,
  scale,
} from '../primitives.ts'
import { $v } from '../vector_3d.ts'
import { HALF_PI, PI, cos, sin, TWO_PI } from '../math_utils.ts'
import { autoRotationEnabled } from '../primitives.ts'

const draw = () => {
  background('#050816')

  const time = millis() / 1000
  const orbitAngle = time * 0.9
  const pulse = 0.55 + 0.25 * sin(time * 1.4)
  const shimmer = 0.45 + 0.2 * sin(time * 2.2)

  if (autoRotationEnabled) {
    rotateX(PI / 4 + sin(time * 0.8) * 0.18)
    rotateY(time * 0.7)
  } else {
    rotateX(PI / 4)
    rotateY(PI / 6)
  }

  render3dAxes()

  isolateTransformations(() => {
    sphere(115, {
      color: `rgba(90, 220, 255, ${0.22 + pulse * 0.1})`,
      strokeColor: 'rgba(255,255,255,0.6)',
      lineWidth: 1.2,
      opacity: 0.28,
    })

    ring(145, 28, {
      color: `rgba(255,255,255,${0.28 + shimmer * 0.2})`,
      lineWidth: 1.4,
      opacity: 0.7,
    })

    ring(175, 18, {
      color: `rgba(255,170,90,${0.22 + pulse * 0.15})`,
      lineWidth: 1.1,
      opacity: 0.65,
    })

    rotateY(time * 1.8)
    rotateX(HALF_PI)
    square2d(220, {
      color: `rgba(255,255,255,${0.08 + shimmer * 0.04})`,
      noStroke: true,
      opacity: 0.7,
    })
  })

  isolateTransformations(() => {
    translate(0, 0, 0)
    rotateY(-time * 1.1)
    scale(1 + 0.12 * sin(time * 1.6))

    cube(92, {
      color: `rgba(255, 255, 255, ${0.12 + pulse * 0.04})`,
      strokeColor: 'rgba(180, 240, 255, 0.35)',
      lineWidth: 1,
      opacity: 0.2,
    })

    box(140, 26, 38, {
      color: `rgba(255, 190, 90, ${0.16 + shimmer * 0.08})`,
      strokeColor: 'rgba(255,240,200,0.4)',
      lineWidth: 1.2,
      opacity: 0.24,
    })
  })

  timesForEach(5, index => {
    const angle = orbitAngle + index * (TWO_PI / 5)
    const orbitRadiusX = 210 + 25 * cos(time * 2.4 + index)
    const orbitRadiusZ = 160 + 22 * sin(time * 2.1 + index * 0.7)
    const yOffset = 70 * sin(time * 1.2 + index)

    isolateTransformations(() => {
      translate(cos(angle) * orbitRadiusX, yOffset, sin(angle) * orbitRadiusZ)
      rotateY(angle * 1.7)
      rotateX(time * 1.35 + index * 0.3)

      circle2d(24 + index * 5, {
        color:
          index % 2 === 0
            ? 'rgba(120, 250, 255, 0.9)'
            : 'rgba(255, 170, 95, 0.9)',
        noStroke: true,
        opacity: 0.8,
      })

      ring(34 + index * 4, 7, {
        color: 'rgba(255,255,255,0.55)',
        lineWidth: 1,
        opacity: 0.8,
      })

      point(ORIGIN, { size: 6, color: index % 2 === 0 ? '#78faff' : '#ffae5f' })
    })
  })

  timesForEach(90, index => {
    const radius = 320 + (index % 11) * 18
    const angle = (index / 90) * TWO_PI + time * 0.25 + (index % 5) * 0.3
    const y = sin(angle * 2.1 + index * 0.4) * 220
    const z = cos(angle * 1.4 + index * 0.08) * radius
    const x = sin(angle * 0.8 + index * 0.13) * radius

    point($v(x, y, z), {
      size: 1 + (index % 7 === 0 ? 2 : 0),
      color: 'rgba(255,255,255,0.8)',
    })
  })
}

const onPaused = () => {
  text2d('PAUSED', $v(0, 260))
}

const { start: startFrameLoop, stop: stopFrameLoop } = createFrameLoop(
  () => {
    resetTransformationMatrix()
    draw()
    render3dScene()
  },
  onPaused,
  FPS,
)

const start = () => {
  startFrameLoop()
}

const stop = () => {
  stopFrameLoop()
}

export { start, stop }
