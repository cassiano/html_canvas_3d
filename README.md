# html_canvas_3d

**A 3D renderer for the HTML `<canvas>` element, written from scratch in TypeScript.**

Application available at: <https://cassiano.github.io/html_canvas_3d/>

`html_canvas_3d` is a small, dependency-light 3D engine that runs entirely in the
browser. It renders onto a plain 2D `<canvas>` context using a software
transformation pipeline: shapes are transformed by a 4x4 matrix, projected with a
perspective camera, depth-sorted and painted back-to-front. There is no
WebGL, no `three.js`, and no runtime dependency — only the browser's own 2D
canvas API.

On top of the engine sits a catalogue of **22 interactive demos**, reachable from
a side menu, from the keyboard, or directly via a URL parameter.

---

## Table of contents

- [Features](#features)
- [Tech stack](#tech-stack)
- [Getting started](#getting-started)
- [Demo catalogue](#demo-catalogue)
- [Controls](#controls)
- [Project structure](#project-structure)
- [Architecture](#architecture)
  - [Coordinate system](#coordinate-system)
  - [The transformation matrix stack](#the-transformation-matrix-stack)
  - [The deferred render list](#the-deferred-render-list)
  - [Perspective projection](#perspective-projection)
  - [Camera controls](#camera-controls)
  - [The frame loop](#the-frame-loop)
- [API reference](#api-reference)
  - [`src/vector_3d.ts` — `Vector3d`](#srcvector_3dts--vector3d)
  - [`src/math_utils.ts` — numeric helpers](#srcmath_utilsts--numeric-helpers)
  - [`src/primitives.ts` — the renderer](#srcprimitivests--the-renderer)
  - [`src/elbow_primitives.ts` — pipe elbows](#srcelbow_primitivests--pipe-elbows)
  - [`src/perlin_noise.ts` — Perlin noise](#srcperlin_noisets--perlin-noise)
  - [`src/utils.ts` — utilities and UI factories](#srcutilsts--utilities-and-ui-factories)
  - [`src/constants.ts` — shared constants](#srcconstantsts--shared-constants)
  - [`src/utility_types.ts` — shared types](#srcutility_typests--shared-types)
  - [`src/home.ts` — the application shell](#srchomets--the-application-shell)
- [Writing a new demo](#writing-a-new-demo)
- [Testing](#testing)
- [Known limitations](#known-limitations)
- [Attribution](#attribution)

---

## Features

- **Software 3D rendering on a 2D canvas.** No WebGL, no external engine.
- **Full 4x4 transformation matrix stack** with `push()` / `pop()` and
  `isolateTransformations()`, so nested scenes can be authored safely.
- **Perspective camera** with a fixed 45° field of view that adapts to the
  canvas size.
- **Painter's algorithm depth sorting.** Every shape is queued with a depth
  value and painted back-to-front, with a stable tie-break for coplanar shapes.
- **Back-face culling**, per shape, so single-sided solids look correct.
- **A rich primitive library**: points, lines, arrows, triangles, quads,
  rectangles, squares, boxes, cubes, spheres, circles, rings, cones, cylinders,
  tori, Saturn-style rings, spherical cheese slices and text.
- **Library of pipe fittings** (24 elbow variants) built on top of the primitives.
- **Interactive camera**: drag to rotate, `Shift`+drag (or middle/right drag) to
  pan, `Ctrl`/`Cmd`+wheel to zoom, double-click to reset.
- **Per-demo control panels** with sliders and toggles, generated at runtime.
- **Keyboard navigation** between demos, plus direct linking with `?demo_id=N`.
- **Optional overlays**: the 3D axis indicators and per-surface normals.
- **Seeded Perlin noise** for organic terrain generation.
- **A unit-tested 3D vector type** (`Vector3d`) with a p5.js-like API.

---

## Tech stack

| Concern      | Choice                                                     |
| ------------ | ---------------------------------------------------------- |
| Language     | TypeScript (strict mode)                                   |
| Bundler      | [Vite](https://vite.dev) 8                                 |
| Runtime      | Browser (ES modules, no transpilation beyond Vite's default) |
| Rendering    | HTML5 Canvas 2D context                                     |
| Tests        | [Deno](https://deno.com) + `@std/assert`                    |
| Deployment   | GitHub Pages via `gh-pages`                                 |

There are no runtime dependencies. The only development dependencies are
`vite`, `gh-pages` and the `deno` shim.

---

## Getting started

```bash
# Install the development dependencies
npm install

# Start the dev server (http://localhost:5173/html_canvas_3d/)
npm run dev

# Build a production bundle into ./dist
npm run build

# Preview the production build locally
npm run preview

# Build and publish to the gh-pages branch
npm run deploy
```

### Running the tests

The unit tests use Deno, not Vitest or Jest, so no extra configuration is
needed beyond the import map already declared in `deno.json`:

```bash
# Run the test suite once
deno test

# Run the test suite in watch mode
deno test --watch
```

### Running the app locally

`vite.config.ts` sets `base: '/html_canvas_3d/'`, so the app is served from
`http://localhost:5173/html_canvas_3d/`. If you need it served from the root
path, change `base` to `'/'`.

---

## Demo catalogue

| # | Name | Description |
| - | ---- | ----------- |
| 1 | Falling Cube + Sphere | A cube and a sphere falling under gravity and bouncing on the floor. |
| 2 | Rotating Boxes | A grid of boxes rotating around the scene. |
| 3 | Rubik Cube | An interactive Rubik's cube whose layers can be twisted from the control panel. |
| 4 | Jerusalem Cube | A cube assembled from a set of L-system-generated paths. |
| 5 | Sphere | A sphere whose tessellation is controlled from the demo's panel. |
| 6 | Circle | Circles of varying radii and segment counts. |
| 7 | Cones | Cones of different sizes and orientations. |
| 8 | Cylinders | Cylinders with varying radii, heights and segment counts. |
| 9 | Arrows | 3D arrows pointing along each axis and into the screen. |
| 10 | Perlin Noise | A terrain-like surface generated from seeded Perlin noise. |
| 11 | Connected Pipes | Pipes connected at right angles using the elbow fittings. |
| 12 | UFO (Flying Saucer) | A flying saucer with a rotating ring and dome. |
| 13 | Tori | A collection of tori (donuts) at different orientations. |
| 14 | Coral Snake | A segmented, snake-like body animated along a path. |
| 15 | 3D Elbow Rollercoaster | A rollercoaster track built entirely from elbow fittings, with a ball rolling along it. |
| 16 | Twin Elbow Towers | Two towers built from mirrored stacks of elbows. |
| 17 | Fireworks | Particles exploding in colour over a night sky. |
| 18 | Boxed Elbows | Elbows enclosed in transparent boxes. |
| 19 | Lumen Orbit | An AI-generated orbiting-light demo. |
| 20 | Saturn Rings | A planet surrounded by a tilted, ringed halo. |
| 21 | Solar System | A miniature solar system with orbiting bodies. |
| 22 | Pac-Man 2D | A playable Pac-Man clone (AI-assisted). |

Demo 22 uses the arrow keys for gameplay. Everywhere else, the arrow keys
navigate between demos.

---

## Controls

### Mouse / trackpad

| Gesture | Action |
| ------- | ------ |
| Left-drag | Rotate the scene |
| `Shift` + left-drag | Pan the scene |
| Middle- or right-drag | Pan the scene |
| `Ctrl`/`Cmd` + wheel | Zoom in and out (pinch gesture on a trackpad) |
| Wheel / two-finger scroll | Pan the scene |
| Double-click | Reset rotation, zoom and pan |

### Keyboard

| Key | Action |
| --- | ------ |
| `↑` / `←` | Previous demo |
| `↓` / `→` | Next demo |
| `Shift` + `↑` / `↓` | Previous / next demo (also works in the Pac-Man demo) |
| `1` … `9` | Jump straight to demo 1–9 |
| `p` | Toggle pause |

### URL

| Parameter | Effect |
| --------- | ------ |
| `?demo_id=N` | Open the app directly on demo `N` (1–22). Invalid or missing values fall back to demo 1. |

Example: <https://cassiano.github.io/html_canvas_3d/?demo_id=22>

### Menu toggles

The side menu exposes three global switches:

- **Show 3D axes** — draws the X/Y/Z axis indicators in the scene.
- **Enable 3D axes auto rotation** — lets the demos rotate themselves.
- **Show normals** — draws the surface normal of every shape.

---

## Project structure

```
.
├── index.html                  # App shell: side menu + <canvas id="animation">
├── package.json                # npm scripts (dev, build, preview, deploy)
├── deno.json                   # Deno import map (jsr:@std/assert)
├── deno.lock                   # Locked Deno dependencies
├── tsconfig.json               # TypeScript configuration (strict, no emit)
├── vite.config.ts              # Vite configuration (base path)
├── public/                     # Static assets (fonts, favicon, icons)
└── src/
    ├── home.ts                 # App shell: demo loading, navigation, camera input
    ├── style.css               # Page and menu styling
    ├── primitives.ts           # The renderer: matrix stack, projection, shapes
    ├── elbow_primitives.ts     # Pipe elbow fittings built on top of primitives
    ├── vector_3d.ts            # The `Vector3d` class and its factories
    ├── math_utils.ts           # Numeric helpers and matrix multiplication
    ├── perlin_noise.ts         # Seeded Perlin noise generator
    ├── utils.ts                # Frame loop, UI factories, assertions
    ├── constants.ts            # Shared constants (axes, FPS, focal length…)
    ├── utility_types.ts        # Shared generic types
    ├── tests/
    │   └── vector_3d_test.ts   # Deno unit tests for `Vector3d`
    └── demo1/ … demo22/        # One folder per demo
        ├── main.ts             # Entry point: must export `start` and `stop`
        └── …                   # Demo-specific modules (optional)
```

Each demo folder may also contain a `doc_img/` directory holding PNG
screenshots referenced from the source as inline comments.

---

## Architecture

The whole engine is a handful of composable modules. Nothing is hidden behind
a framework: a demo calls drawing functions, and the renderer takes care of
transforming, sorting and painting.

### Coordinate system

The world uses a right-handed coordinate system. The default transformation
matrix inverts the Y axis so that **+Y points up on the screen**, which matches
the intuition of most 2D drawing APIs.

The unit vectors of each axis are exported from `src/constants.ts`:

```ts
AXES_NAMES // ['x', 'y', 'z', '-x', '-y', '-z']
AXES.x     // Vector3d(1, 0, 0)
AXES['-z'] // Vector3d(0, 0, -1)
```

### The transformation matrix stack

The renderer keeps a single current 4x4 transformation matrix plus a stack of
saved copies.

- `translate()`, `rotate()`, `rotateX()`, `rotateY()`, `rotateZ()` and `scale()`
  multiply the current matrix.
- `push()` saves a copy of the current matrix; `pop()` restores it.
  `pop()` throws `Error('Empty transformation matrix stack')` when the stack is
  empty.
- `isolateTransformations(fn)` is the convenient combination of the two: it
  runs `fn` and restores the previous state afterwards, which makes it safe to
  author sub-scenes without leaking transformations.
- `resetTransformationMatrix()` restores the baseline matrix (identity, with
  Y inverted) and re-applies the current zoom and drag rotation. **Every frame
  must call it before drawing**, otherwise transformations accumulate.

Aliases `pushMatrix` / `popMatrix` / `restoreCoordinateSystem` are provided for
Processing-flavoured code.

### The deferred render list

Drawing a shape does not paint it immediately. Instead, each primitive:

1. transforms its vertices with the current matrix,
2. projects them onto the screen,
3. computes a depth value,
4. pushes a closure into a deferred render list.

`render3dScene()` then sorts that list back-to-front and executes every
closure. This is the [painter's algorithm](https://en.wikipedia.org/wiki/Painter%27s_algorithm):
shapes that are farther away are painted first, so nearer shapes overlap them.
The queue is emptied after each call, so `render3dScene()` must be invoked
exactly once per frame.

Shapes with (almost) the same depth keep their insertion order, so coplanar
surfaces do not flicker.

### Perspective projection

The camera uses a fixed 45° vertical field of view. The focal length is derived
from the smaller canvas dimension, so the framing stays consistent when the
window is resized. Points behind the camera (that is, with `z >= focalLength`)
do not project and are skipped.

### Camera controls

The user's camera state (drag rotation, zoom factor and pan offset) is stored
separately from the scene transformations. `resetTransformationMatrix()`
combines the two, so demos never need to know about the camera.

| Function | Purpose |
| -------- | ------- |
| `setDragRotation(x, y)` / `addDragRotation(x, y)` / `resetDragRotation()` | Rotation around the X and Y axes, in radians. |
| `setZoom(z)` / `addZoom(delta)` / `resetZoom()` | Uniform zoom factor. |
| `setPanOffset(x, y)` / `addPanOffset(x, y)` / `resetPanOffset()` | Screen-space pan, in pixels. |

### The frame loop

`createFrameLoop(drawFn, onPausedFn, targetFPS)` returns `{ start, stop }`.
The loop throttles drawing to the requested frame rate, isolates the
transformation state around every frame, and keeps the statistics exposed by
`millis()`, `fps()`, `cumulativeFps()` and `frameCount()` up to date.

`togglePause()` freezes the drawing while keeping the loop alive, and
`onPausedFn` is called once so the demo can display a "paused" indicator.

Every demo module follows the same shape:

```ts
export function start() { /* begin the frame loop */ }
export function stop() { /* end the frame loop */ }
```

---

## API reference

Every public symbol in the project is documented with TSDoc comments in place.
The summary below is a map of the most important entry points.

### `src/vector_3d.ts` — `Vector3d`

A 3D vector with a p5.js-like, chainable API. The class is iterable, so it
can be spread (`[...v]`) and destructured (`const [x, y, z] = v`).

```ts
const v = $v(1, 2, 3)          // Factory (alias of Vector3d.create)
const w = createVector(1, 2)   // p5-style alias of `$v`
```

| Member | Description |
| ------ | ----------- |
| `x`, `y`, `z` | Read/write accessors for the components. |
| `setX()`, `setY()`, `setZ()` | Chainable setters; return `this`. |
| `clone()` | Returns an independent copy. |
| `mag()`, `magSq()` | Length of the vector, and its square. |
| `normalize()` | Scales the vector to unit length. Throws `Error('Sorry, but division by 0 is not supported')` for a zero vector. |
| `setMag(m)` | Scales the vector to the given length. |
| `heading()` | Angle of a 2D vector in `[-PI, PI]`. Throws an `Error` with the message ``` `heading()` can only be called on 2d vectors ``` when `z !== 0`. |
| `setHeading(a)` | Rotates a 2D vector to the given angle, preserving its length. Throws an `Error` with the message ``` `setHeading()` can only be called on 2d vectors ``` when `z !== 0`. |
| `add()`, `sub()` | Component-wise addition / subtraction; accept a vector or scalars. |
| `mult(s)`, `div(s)` | Scale by a scalar. `div(0)` throws `Error('Sorry, but division by 0 is not supported')`. |
| `dot()`, `cross()`, `hadamardProduct()` | Vector products. `hadamardProduct()` returns a new vector and never mutates its operands. |
| `dist()`, `distSq()`, `manhattanDist()` | Distances between two vectors. |
| `equals()`, `notEquals()`, `isAllZeros()`, `isAllOnes()` | Comparison helpers. |
| `angleBetween()` | Angle between two vectors; `NaN` when either has zero length. |
| `lerp()` | Linear interpolation between two vectors. |
| `toArray()`, `toString()` | Serialisation. |
| `Vector3d.random2d()`, `Vector3d.random3d()` | Random unit vectors. |

### `src/math_utils.ts` — numeric helpers

Re-exports the `Math` constants (`PI`, `TWO_PI`, `HALF_PI`, `SQRT2`, …) and adds:

| Function | Description |
| -------- | ----------- |
| `radians(deg)` / `degrees(rad)` | Angle unit conversion. |
| `random(min, max)` | Random number in the given range. |
| `map(value, startLow, startHigh, stopLow, stopHigh)` | Re-map a value between ranges. |
| `multiplyMatrices(a, b)` | Multiplies two matrices. Throws `Error` when the column count of the first and the row count of the second do not match. |
| `multiply4x4Matrices(a, b)` | Multiplies two 4x4 matrices. |
| `multiply4x4MatrixBy4dPoint(matrix, point)` | Multiplies a 4x4 matrix by a 4-element point. |
| `polarToCartesian2d(radius, angle)` | Polar → cartesian conversion. |
| `cartesianToPolar2d(x, y)` | Cartesian → polar conversion. |

### `src/primitives.ts` — the renderer

**Scene state**

| Export | Description |
| ------ | ----------- |
| `animation`, `ctx` | The canvas element and its 2D context. |
| `background(color)` | Fills the canvas with a solid colour. |
| `render3dScene()` | Paints every queued shape, back-to-front, and clears the queue. |
| `resetTransformationMatrix()` | Restores the baseline matrix and re-applies zoom and drag rotation. |
| `push()` / `pop()` / `pushMatrix` / `popMatrix` | Transformation stack. |
| `isolateTransformations(fn)` / `restoreCoordinateSystem` | Runs `fn` with an isolated transformation state. |
| `translate()`, `rotate()`, `rotateX()`, `rotateY()`, `rotateZ()`, `scale()` | Multiply the current transformation matrix. |
| `project3dTo2d(point)` | Projects a world point onto the screen; `undefined` when the point is behind the camera. |
| `transform(point)` / `transformNormal(point)` | Applies the current matrix to a point or to a direction. |
| `centralize(point?)` | Moves a point to the canvas centre, applying the pan offset. |
| `setDragRotation()` / `addDragRotation()` / `resetDragRotation()` | Camera rotation. |
| `setZoom()` / `addZoom()` / `resetZoom()` | Camera zoom. |
| `setPanOffset()` / `addPanOffset()` / `resetPanOffset()` | Camera pan. |
| `setRender3dAxesEnabled()`, `setAutoRotationCheckboxEnabled()`, `setshowNormals()` | Toggle the optional overlays. |
| `render3dAxes(length?)` | Draws the axis indicators. |

**Shape primitives**

`point()`, `line()`, `arrow()`, `triangle2d()`, `quad()`, `rect2d()`,
`square2d()`, `box()`, `cube()`, `sphere()`, `circle2d()`, `circlePerimeter2d()`,
`ring()`, `saturnRing()`, `sphericalCheeseSlice()`, `torus()`, `cone()`,
`cylinder()`, `text2d()`.

**Shape options**

Every primitive accepts a partial `ShapeOptions` object. Unspecified fields
fall back to `DEFAULT_SHAPE_OPTIONS`.

| Field | Description |
| ----- | ----------- |
| `color` | Fill colour (CSS colour, gradient or pattern). Default `'gray'`. |
| `strokeColor` | Outline colour. Default `'black'`. |
| `lineWidth` | Outline width in pixels. Default `1`. |
| `opacity` | Fill opacity within `[0, 1]`. Default `1`. |
| `noStroke` | Skip the outline. Default `false`. |
| `size` | Size of the shape in pixels. Default `1`. |
| `noSplit` | Draw lines and arrows as a single segment. Default `false`. |
| `isDoubleSided` | Disable back-face culling for this shape. Default `false`. |
| `nevershowNormals` | Never display this shape's normal. Default `false`. |
| `percentage` | Fraction of the shape to draw, within `[0, 1]`. Default `1`. |

`CircularShapeOptions` adds `circleSegments` to control how finely a circle is
approximated; `SphericalShapeOptions` adds sphere-specific knobs;
`ArrowShapeOptions` controls the arrow head.

### `src/elbow_primitives.ts` — pipe elbows

Provides `ElbowShapeOptions` (circular options plus `elbowCircleSlices`) and
the `elbow` lookup table holding all 24 combinations of a 90° pipe bend.

```ts
import { elbow } from './elbow_primitives.ts'

elbow.x.y(20)     // An elbow bending from +X towards +Y
elbow['-z'].y(20) // An elbow bending from -Z towards +Y
```

The outer key is the axis the elbow starts from and the inner key is the axis
it bends to, both using the `AXES_NAMES` naming convention.

### `src/perlin_noise.ts` — Perlin noise

`PerlinNoise` produces coherent noise in the `[0, 1]` range from a seeded
permutation table, so the same seed always yields the same field.

```ts
import { perlin } from './perlin_noise.ts'

perlin.seed(42)   // Re-seed the shared generator
perlin.noise(x, y, z)
```

A singleton `perlin` instance is exported for convenience.

### `src/utils.ts` — utilities and UI factories

**Loop helpers** — `createFrameLoop()`, `togglePause()`, `millis()`, `fps()`,
`cumulativeFps()`, `frameCount()`.

**Collection helpers** — `timesForEach()`, `timesMap()`, `timesReduce()`,
`timesMapN()`, `timesForEachN()`, `reversedForEach()`, `sample()`,
`arraySub()`, `logJson()`, `randomColor()`.

**UI factories** — `createSlider(config)`, `createToggle(config)` and
`createDemoControlPanel(container)` build the small control panels that the
demos float over the canvas.

**Assertions** — `assertIsNotUndefined()`, `assertIsNotNull()` and
`assertIsNotUndefinedOrNull()` throw a `TypeError` when the value fails the
check.

### `src/constants.ts` — shared constants

`AXES_NAMES`, `AXES`, `AxesNamesType`, `FPS`, `FOCAL_LENGTH`, `FPS_WINDOW`,
`FPS_LOGGING_FRAME_PERIOD`, `MAX_LINE_SEGMENT_SIZE`, `DEFAULT_CIRCLE_SEGMENTS`,
`DEFAULT_ARROW_CIRCLE_SEGMENTS`, `DEFAULT_SPHERE_LINES`,
`DEFAULT_ELBOW_CIRCLE_SLICES`, `Z_EPSILON`, `ORIGIN`, `NULL_VECTOR`,
`ZERO_VECTOR`, `NORMAL_CONFIG`.

### `src/utility_types.ts` — shared types

`Tuple<T, N>` builds fixed-length tuple types, e.g. `Tuple<number, 3>` resolves
to `[number, number, number]`.

### `src/home.ts` — the application shell

The shell discovers the demos with Vite's `import.meta.glob('./demo*/main.ts')`,
lazily imports the selected one, and wires up the menu, the keyboard shortcuts
and the camera gestures. It also reads the `demo_id` query parameter to pick
the initial demo.

---

## Writing a new demo

1. Create `src/demoN/main.ts` (or reuse the next free number).
2. Export `start()` and `stop()` — the shell requires both.
3. Draw your scene inside a frame loop.

```ts
import { createFrameLoop } from '../utils.ts'
import { cube, render3dScene, resetTransformationMatrix } from '../primitives.ts'

const frameLoop = createFrameLoop(() => {
  resetTransformationMatrix()
  cube(50, { color: 'orange' })
  render3dScene()
}, () => {
  // Called once when the demo is paused.
})

export function start() {
  frameLoop.start()
}

export function stop() {
  frameLoop.stop()
}
```

4. Add a button to `index.html` with the matching `id="demoN"` and a label.

That is all: the shell discovers the module through the glob, so no
registration step is required.

---

## Testing

The test suite lives in `src/tests/` and is executed with Deno:

```bash
deno test
```

The current suite covers `Vector3d` thoroughly — construction and accessors,
cloning, magnitude, normalisation, headings (including the negative-angle
convention), the arithmetic overloads, dot/cross/Hadamard products, distances,
comparisons, interpolation, iteration, serialisation and the random factories —
plus the documented error cases (division by zero and the 2D-only heading
methods).

The demos themselves are visual and are not covered by automated tests.

---

## Known limitations

- **Painter's algorithm, not a depth buffer.** Intersecting or tightly
  interpenetrating surfaces can produce sorting artefacts. The stable
  tie-break keeps coplanar shapes consistent, but it cannot resolve arbitrary
  intersections.
- **Software rendering.** Every vertex is transformed in JavaScript, so very
  large scenes are CPU-bound. The demos are designed to stay well inside the
  frame budget.
- **Back-face culling** is per shape and based on the winding of the
  generated geometry; `isDoubleSided` disables it for the shapes that need it.
- **No lighting model.** Shading comes from the shape colours themselves; the
  optional "show normals" overlay is a debugging aid, not a renderer feature.
- **No texture mapping, lighting, shadows or transparency sorting.** Fill
  opacity is supported, but translucent shapes are still painted in depth
  order rather than being alpha-sorted.
- **Browser-only.** The engine touches `document` at import time, so it cannot
  run in Node or Deno outside of a DOM environment.
- **Copy/paste artefacts in the demo control panels.** Some demos guard their
  control-panel accessors with an error message inherited from another demo
  (for instance, demo 17 mentions `demo3Form`). The messages are documented
  verbatim so that they match the runtime behaviour.

---

## Attribution

Developed and maintained by Cassiano D'Andrea.

Some modules carry an `AI-generated code` or `AI-assisted code` banner
(`src/home.ts`, `src/perlin_noise.ts`, `src/demo19/main.ts` and the whole of
`src/demo22/`). Those parts were produced with AI assistance and reviewed by
the author.

The "Press Start 2P" font used by the interface is self-hosted from `public/fonts`
and is distributed under the SIL Open Font License (see `public/fonts/OFL.txt`).
