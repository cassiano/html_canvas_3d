/// <reference lib="deno.ns" />

// To execute tests, run:
//
// `deno test`
// `deno test --watch`

import './dom_stub.ts'

import {
  assert,
  assertEquals,
  assertStrictEquals,
  assertThrows,
} from '@std/assert'

import { flushAnimationFrames } from './dom_stub.ts'
import { documentStub, recordedCalls, resetScene } from './test_helpers.ts'
import { createSlider, createToggle } from '../utils.ts'
import { render3dScene } from '../primitives.ts'
import { AXES, AXES_NAMES } from '../constants.ts'
import {
  FACE_COLORS,
  FACE_NORMALS,
  FACES,
  FACES_PER_CUBIE,
  INITIAL_CUBIE_SIZE,
  INITIAL_CUBIE_SPACING,
  INITIAL_CUBIES_PER_AXIS,
} from '../demo3/constants.ts'
import {
  cubieSize,
  cubieSpacing,
  cubiesPerAxis,
  demo3Form,
  renderExternalFacesOnly,
  rotateCubies,
} from '../demo3/demo3_form.ts'
import { Cubie } from '../demo3/cubie.ts'
import { CubieFace } from '../demo3/cubie_face.ts'
import { RubikCube } from '../demo3/rubik_cube.ts'
import { start, stop } from '../demo3/main.ts'

/**
 * Alias for `Deno.test`, used to register the test cases in this file.
 */
const test = Deno.test

/**
 * The values used to populate the demo's control panel.
 */
interface Demo3FormValues {
  /** The value of the "cubies per axis" slider. */
  cubiesPerAxis?: number
  /** The value of the "cubie size" slider. */
  cubieSize?: number
  /** The value of the "cubie spacing" slider. */
  cubieSpacing?: number
  /** The state of the "Rotate cubies?" toggle. */
  rotateCubies?: boolean
  /** The state of the "Render external faces only?" toggle. */
  renderExternalFacesOnly?: boolean
}

/**
 * Empties the demo's control panel state.
 *
 * @returns Nothing; the demo's form is emptied in place.
 */
const resetDemo3Form = () => {
  delete demo3Form.sliders
  delete demo3Form.toggles
}

/**
 * Creates the demo's sliders, without creating its toggles.
 *
 * @param values - The values assigned to the sliders.
 * @returns Nothing; the demo's form is updated in place.
 */
const setupDemo3Sliders = (values: Demo3FormValues = {}) => {
  demo3Form.sliders = {
    cubiesPerAxis: createSlider({
      label: 'Cubies per axis',
      min: 1,
      max: 70,
      value: values.cubiesPerAxis ?? INITIAL_CUBIES_PER_AXIS,
    }),
    cubieSize: createSlider({
      label: 'Cubie size',
      min: 5,
      max: 200,
      step: 5,
      value: values.cubieSize ?? INITIAL_CUBIE_SIZE,
    }),
    cubieSpacing: createSlider({
      label: 'Cubie spacing',
      min: 0,
      max: 100,
      value: values.cubieSpacing ?? INITIAL_CUBIE_SPACING,
    }),
  }
}

/**
 * Creates the demo's toggles, without creating its sliders.
 *
 * @param values - The values assigned to the toggles.
 * @returns Nothing; the demo's form is updated in place.
 */
const setupDemo3Toggles = (values: Demo3FormValues = {}) => {
  demo3Form.toggles = {
    rotateCubies: createToggle({
      label: 'Rotate cubies?',
      value: values.rotateCubies ?? false,
      showValue: false,
    }),
    renderExternalFacesOnly: createToggle({
      label: 'Render external faces only?',
      value: values.renderExternalFacesOnly ?? false,
      showValue: false,
    }),
  }
}

/**
 * Creates the demo's sliders and toggles.
 *
 * @param values - The values assigned to the sliders and toggles.
 * @returns Nothing; the demo's form is updated in place.
 */
const setupDemo3Form = (values: Demo3FormValues = {}) => {
  setupDemo3Sliders(values)
  setupDemo3Toggles(values)
}

/**
 * Flushes the deferred render queue and clears the recorded drawing
 * operations, so that a test can count only the shapes it draws itself.
 *
 * @returns Nothing; the renderer and the recorder are reset.
 */
const clearScene = () => {
  render3dScene()
  resetScene()
}

/**
 * Returns the colours of the shapes painted since the last reset.
 *
 * @returns The distinct fill colours, in the order they were painted.
 */
const paintedColours = (): unknown[] => [
  ...new Set(recordedCalls('fill').map(call => call.fillStyle)),
]

/**
 * Verifies that the demo's constants declare six faces, indexed from `0` to
 * `5`, and that the number of faces per cubie matches the number of declared
 * faces.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Demo3 - Constants: the face indices cover every face of a cubie', () => {
  assertEquals(FACES_PER_CUBIE, 6)
  assertEquals(Object.keys(FACES).length, FACES_PER_CUBIE)
  assertEquals(Object.values(FACES).toSorted(), [0, 1, 2, 3, 4, 5])
  assertEquals(FACES.front, 0)
  assertEquals(FACES.right, 1)
  assertEquals(FACES.back, 2)
  assertEquals(FACES.left, 3)
  assertEquals(FACES.top, 4)
  assertEquals(FACES.bottom, 5)
})

/**
 * Verifies that the demo's constants declare the initial size of the cube and
 * of a single cubie.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Demo3 - Constants: the initial cube settings', () => {
  assertEquals(INITIAL_CUBIES_PER_AXIS, 9)
  assertEquals(INITIAL_CUBIE_SIZE, 25)
  assertEquals(INITIAL_CUBIE_SPACING, 20)
})

/**
 * Verifies that every declared face has its own colour, and that the colours
 * are the ones expected by the demo.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Demo3 - Constants: every face has its own colour', () => {
  assertEquals(Object.keys(FACE_COLORS).length, FACES_PER_CUBIE)
  assertEquals(FACE_COLORS[FACES.front], 'green')
  assertEquals(FACE_COLORS[FACES.right], 'red')
  assertEquals(FACE_COLORS[FACES.back], 'blue')
  assertEquals(FACE_COLORS[FACES.left], 'orange')
  assertEquals(FACE_COLORS[FACES.top], 'white')
  assertEquals(FACE_COLORS[FACES.bottom], 'yellow')

  const colours = Object.values(FACE_COLORS)

  assertEquals(new Set(colours).size, FACES_PER_CUBIE)
})

/**
 * Verifies that the normal of every face is a unit vector pointing outwards
 * along the axis the face is named after.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Demo3 - Constants: the face normals point outwards', () => {
  assertEquals(Object.keys(FACE_NORMALS).length, FACES_PER_CUBIE)

  assert(FACE_NORMALS[FACES.front].equals(AXES.z))
  assert(FACE_NORMALS[FACES.right].equals(AXES.x))
  assert(FACE_NORMALS[FACES.back].equals(AXES['-z']))
  assert(FACE_NORMALS[FACES.left].equals(AXES['-x']))
  assert(FACE_NORMALS[FACES.top].equals(AXES.y))
  assert(FACE_NORMALS[FACES.bottom].equals(AXES['-y']))

  Object.values(FACE_NORMALS).forEach(normal => {
    assertEquals(normal.mag(), 1)
    assert(AXES_NAMES.some(axis => normal.equals(AXES[axis])))
  })
})

/**
 * Verifies that the slider accessors of the demo's form throw an `Error` when
 * the control panel has not been created yet.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Demo3 - Form: the slider accessors throw without sliders', () => {
  resetDemo3Form()

  assertThrows(
    () => cubiesPerAxis(),
    Error,
    'demo3Form.sliders should contain a value',
  )
  assertThrows(
    () => cubieSize(),
    Error,
    'demo3Form.sliders should contain a value',
  )
  assertThrows(
    () => cubieSpacing(),
    Error,
    'demo3Form.sliders should contain a value',
  )
})

/**
 * Verifies that the toggle accessors of the demo's form throw an `Error` when
 * the control panel has not been created yet.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Demo3 - Form: the toggle accessors throw without toggles', () => {
  resetDemo3Form()

  assertThrows(
    () => rotateCubies(),
    Error,
    'demo3Form.toggles should contain a value',
  )
  assertThrows(
    () => renderExternalFacesOnly(),
    Error,
    'demo3Form.toggles should contain a value',
  )
})

/**
 * Verifies that the slider accessors return the values currently held by the
 * demo's sliders.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Demo3 - Form: the slider accessors return the current values', () => {
  resetDemo3Form()
  setupDemo3Sliders({
    cubiesPerAxis: 5,
    cubieSize: 40,
    cubieSpacing: 7,
  })

  assertEquals(cubiesPerAxis(), 5)
  assertEquals(cubieSize(), 40)
  assertEquals(cubieSpacing(), 7)
})

/**
 * Verifies that the toggle accessors return the states currently held by the
 * demo's toggles.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Demo3 - Form: the toggle accessors return the current states', () => {
  resetDemo3Form()
  setupDemo3Toggles({
    rotateCubies: true,
    renderExternalFacesOnly: false,
  })

  assertEquals(rotateCubies(), true)
  assertEquals(renderExternalFacesOnly(), false)

  demo3Form.toggles!.rotateCubies.setValue(false)
  demo3Form.toggles!.renderExternalFacesOnly.setValue(true)

  assertEquals(rotateCubies(), false)
  assertEquals(renderExternalFacesOnly(), true)
})

/**
 * Verifies that the slider accessors follow the sliders' own values when
 * they change.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Demo3 - Form: the slider accessors follow the sliders', () => {
  resetDemo3Form()
  setupDemo3Sliders()

  demo3Form.sliders!.cubieSize.setValue(60)

  assertEquals(cubieSize(), 60)
})

/**
 * Verifies that a cubie keeps the position it was built with and that it is
 * made of six faces, one for each direction of the cube.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Demo3 - Cubie: a cubie keeps its position and builds six faces', () => {
  const cube = new RubikCube(25, 3)

  const cubie = new Cubie(cube, 1, -2, 3, {
    x: true,
    y: false,
    z: false,
    '-x': false,
    '-y': false,
    '-z': false,
  })

  assertEquals(cubie.position.toArray(), [1, -2, 3])
  assertEquals(cubie.faces.length, FACES_PER_CUBIE)
  assertStrictEquals(cubie.cube, cube)
  assertStrictEquals(cubie.faces[0].cubie, cubie)
})

/**
 * Verifies that the faces of a cubie are created in the order declared by the
 * `FACES` constant, each one with the matching colour and normal.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Demo3 - Cubie: the faces are created in the declared order', () => {
  const cube = new RubikCube(25, 3)

  const cubie = new Cubie(cube, 0, 0, 0, {
    x: false,
    y: false,
    z: false,
    '-x': false,
    '-y': false,
    '-z': false,
  })

  cubie.faces.forEach((face, index) => {
    assertEquals(face.color, FACE_COLORS[index])
    assert(face.normal.equals(FACE_NORMALS[index]))
  })
})

/**
 * Verifies that a cubie is external as soon as it touches one of the cube's
 * outer surfaces, and internal otherwise.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Demo3 - Cubie: only the cubies touching a surface are external', () => {
  const cube = new RubikCube(25, 3)

  const externalCubie = new Cubie(cube, 1, 0, 0, {
    x: true,
    y: false,
    z: false,
    '-x': false,
    '-y': false,
    '-z': false,
  })

  const internalCubie = new Cubie(cube, 0, 0, 0, {
    x: false,
    y: false,
    z: false,
    '-x': false,
    '-y': false,
    '-z': false,
  })

  assertEquals(externalCubie.isExternal, true)
  assertEquals(externalCubie.isInternal, false)
  assertEquals(internalCubie.isExternal, false)
  assertEquals(internalCubie.isInternal, true)
})

/**
 * Verifies that a cubie's size is the size shared by every cubie of its cube.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Demo3 - Cubie: the size of a cubie comes from its cube', () => {
  const cube = new RubikCube(33, 3)

  assertEquals(cube.cubies[0].size, 33)
})

/**
 * Verifies that the center of a cubie is its position, scaled by the size of
 * a cubie plus the gap between two neighbouring cubies.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Demo3 - Cubie: the center accounts for the size and spacing', () => {
  resetDemo3Form()
  setupDemo3Form({ cubieSize: 25, cubieSpacing: 20 })

  const cube = new RubikCube(25, 3)

  assertEquals(cube.cubies[0].center.toArray(), [-45, -45, -45])
  assertEquals(cube.cubies[13].center.toArray(), [0, 0, 0])
})

/**
 * Verifies that reading the center of a cubie throws an `Error` when the
 * demo's sliders have not been created yet.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Demo3 - Cubie: the center throws when the sliders are missing', () => {
  resetDemo3Form()

  const cube = new RubikCube(25, 3)

  assertThrows(
    () => void cube.cubies[0].center,
    Error,
    'demo3Form.sliders should contain a value',
  )
})

/**
 * Verifies that rendering a cubie throws an `Error` when the demo's sliders
 * have not been created yet.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Demo3 - Cubie: rendering throws when the sliders are missing', () => {
  resetDemo3Form()

  const cube = new RubikCube(25, 3)

  assertThrows(
    () => cube.cubies[0].render(),
    Error,
    'demo3Form.sliders should contain a value',
  )
})

/**
 * Verifies that rendering a cubie throws an `Error` when the demo's toggles
 * have not been created yet.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Demo3 - Cubie: rendering throws when the toggles are missing', () => {
  resetDemo3Form()
  setupDemo3Sliders()

  const cube = new RubikCube(25, 3)

  assertThrows(
    () => cube.cubies[0].render(),
    Error,
    'demo3Form.toggles should contain a value',
  )
})

/**
 * Verifies that the internal cubies are not drawn when the cubies have no
 * spacing between them.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Demo3 - Cubie: the internal cubies are skipped without spacing', () => {
  resetDemo3Form()
  setupDemo3Form({ cubieSpacing: 0 })

  const cube = new RubikCube(25, 3)

  clearScene()

  cube.cubies[13].render()
  render3dScene()

  assertEquals(recordedCalls('fill').length, 0)
})

/**
 * Verifies that the faces of a cubie are laid out around the cubie's center,
 * one per direction of the cube.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Demo3 - CubieFace: the face centers are offset along the normal', () => {
  resetDemo3Form()
  setupDemo3Form({ cubieSize: 25 })

  const cube = new RubikCube(25, 3)
  const cubie = cube.cubies[13]

  assertEquals(cubie.faces[0].center.toArray(), [0, 0, 12.5])
  assertEquals(cubie.faces[1].center.toArray(), [12.5, 0, 0])
  assertEquals(cubie.faces[2].center.toArray(), [0, 0, -12.5])
  assertEquals(cubie.faces[3].center.toArray(), [-12.5, 0, 0])
  assertEquals(cubie.faces[4].center.toArray(), [0, 12.5, 0])
  assertEquals(cubie.faces[5].center.toArray(), [0, -12.5, 0])
})

/**
 * Verifies that the size of a face is the size of the cubie it belongs to.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Demo3 - CubieFace: the size of a face comes from its cubie', () => {
  const cube = new RubikCube(42, 3)

  assertEquals(cube.cubies[0].faces[0].size, 42)
})

/**
 * Verifies that the absolute center of a face is the cubie's center plus the
 * face's own offset.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Demo3 - CubieFace: the absolute center combines both centers', () => {
  resetDemo3Form()
  setupDemo3Form({ cubieSize: 25, cubieSpacing: 20 })

  const cube = new RubikCube(25, 3)
  const face = cube.cubies[0].faces[0]

  assertEquals(face.absoluteCenter.toArray(), [-45, -45, -32.5])
})

/**
 * Verifies that the absolute center of a face throws an `Error` when the
 * demo's sliders have not been created yet.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Demo3 - CubieFace: the absolute center throws without sliders', () => {
  resetDemo3Form()

  const cube = new RubikCube(25, 3)

  assertThrows(
    () => void cube.cubies[0].faces[0].absoluteCenter,
    Error,
    'demo3Form.sliders should contain a value',
  )
})

/**
 * Verifies that only the faces lying on one of the cube's outer surfaces are
 * external.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Demo3 - CubieFace: only the faces on a surface are external', () => {
  const cube = new RubikCube(25, 3)

  const corner = cube.cubies[0]

  assertEquals(corner.faces[FACES.front].isExternal, false)
  assertEquals(corner.faces[FACES.right].isExternal, false)
  assertEquals(corner.faces[FACES.back].isExternal, true)
  assertEquals(corner.faces[FACES.left].isExternal, true)
  assertEquals(corner.faces[FACES.top].isExternal, false)
  assertEquals(corner.faces[FACES.bottom].isExternal, true)

  assertEquals(corner.faces[FACES.front].isInternal, true)
  assertEquals(corner.faces[FACES.back].isInternal, false)

  cube.cubies[13].faces.forEach(face => {
    assertEquals(face.isExternal, false)
    assertEquals(face.isInternal, true)
  })
})

/**
 * Verifies that the external state of a face is decided by the axis the face
 * points to and by the cubie's own position on that axis.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Demo3 - CubieFace: the external state follows the face axis', () => {
  const cube = new RubikCube(25, 3)

  const cubie = new Cubie(cube, 1, 0, 0, {
    x: true,
    y: false,
    z: false,
    '-x': false,
    '-y': false,
    '-z': false,
  })

  assertEquals(new CubieFace(cubie, 'red', AXES.x).isExternal, true)
  assertEquals(new CubieFace(cubie, 'green', AXES.z).isExternal, false)
  assertEquals(new CubieFace(cubie, 'blue', AXES['-x']).isExternal, false)
})

/**
 * Verifies that rendering a face throws an `Error` when the demo's sliders
 * have not been created yet.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Demo3 - CubieFace: rendering throws when the sliders are missing', () => {
  resetDemo3Form()

  const cube = new RubikCube(25, 3)

  assertThrows(
    () => cube.cubies[0].faces[0].render(),
    Error,
    'demo3Form.sliders should contain a value',
  )
})

/**
 * Verifies that rendering a face throws an `Error` when the demo's toggles
 * have not been created yet.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Demo3 - CubieFace: rendering throws when the toggles are missing', () => {
  resetDemo3Form()
  setupDemo3Sliders()

  const cube = new RubikCube(25, 3)

  assertThrows(
    () => cube.cubies[0].faces[0].render(),
    Error,
    'demo3Form.toggles should contain a value',
  )
})

/**
 * Verifies that a rendered face is painted with its own colour.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Demo3 - CubieFace: a rendered face is painted with its colour', () => {
  resetDemo3Form()
  setupDemo3Form({ cubieSize: 25, cubieSpacing: 20 })

  const cube = new RubikCube(25, 3)
  const face = cube.cubies[0].faces[FACES.front]

  clearScene()

  face.render()
  render3dScene()

  assert(recordedCalls('fill').length > 0)
  assertEquals(paintedColours(), ['green'])
})

/**
 * Verifies that a cube arranges its cubies in a regular grid, with as many
 * cubies along each axis as requested.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Demo3 - RubikCube: the cube arranges its cubies in a grid', () => {
  const cube = new RubikCube(25, 4)

  assertEquals(cube.cubieSize, 25)
  assertEquals(cube.cubiesPerAxis, 4)
  assertEquals(cube.cubies.length, 4 * 4 * 4)

  cube.cubies.forEach(cubie => assertStrictEquals(cubie.cube, cube))
})

/**
 * Verifies that the cubies of a cube are centred on the cube's origin.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Demo3 - RubikCube: the cubies are centred on the cube', () => {
  const cube = new RubikCube(25, 3)

  const positions = cube.cubies.map(cubie => cubie.position.toArray())

  assertEquals(new Set(positions.map(position => position.join(','))).size, 27)
  assertEquals(positions.map(position => position[0]).toSorted(), [
    -1, -1, -1, -1, -1, -1, -1, -1, -1,
    0, 0, 0, 0, 0, 0, 0, 0, 0,
    1, 1, 1, 1, 1, 1, 1, 1, 1,
  ])
})

/**
 * Verifies that the cubies sitting at the ends of an axis are flagged as the
 * endpoints of that axis.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Demo3 - RubikCube: the cubies at the axis ends are flagged', () => {
  const cube = new RubikCube(25, 3)

  const corner = cube.cubies.find(cubie =>
    cubie.position.equals(1, 1, 1)
  )!

  assert(corner)
  assertEquals(corner.isLocatedInAxisEndpoint, {
    x: true,
    y: true,
    z: true,
    '-x': false,
    '-y': false,
    '-z': false,
  })

  const opposite = cube.cubies.find(cubie =>
    cubie.position.equals(-1, -1, -1)
  )!

  assert(opposite)
  assertEquals(opposite.isLocatedInAxisEndpoint, {
    x: false,
    y: false,
    z: false,
    '-x': true,
    '-y': true,
    '-z': true,
  })
})

/**
 * Verifies that rendering a cube throws an `Error` when the demo's sliders
 * have not been created yet.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Demo3 - RubikCube: rendering throws when the sliders are missing', () => {
  resetDemo3Form()

  const cube = new RubikCube(25, 3)

  assertThrows(
    () => cube.render(),
    Error,
    'demo3Form.sliders should contain a value',
  )
})

/**
 * Verifies that rendering a cube throws an `Error` when the demo's toggles
 * have not been created yet.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Demo3 - RubikCube: rendering throws when the toggles are missing', () => {
  resetDemo3Form()
  setupDemo3Sliders()

  const cube = new RubikCube(25, 3)

  assertThrows(
    () => cube.render(),
    Error,
    'demo3Form.toggles should contain a value',
  )
})

/**
 * Verifies that a rendered cube paints the faces of its cubies.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Demo3 - RubikCube: a rendered cube paints its cubies', () => {
  resetDemo3Form()
  setupDemo3Form({ cubieSize: 25, cubieSpacing: 20 })

  const cube = new RubikCube(25, 3)

  clearScene()

  cube.render()
  render3dScene()

  assert(recordedCalls('fill').length > 0)
  assertEquals(paintedColours().toSorted(), [
    'green',
    'orange',
    'red',
    'white',
    'yellow',
  ])
})

/**
 * Verifies that only the outer faces of the cubies are painted when the
 * "Render external faces only?" toggle is on.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Demo3 - RubikCube: only the external faces are painted on demand', () => {
  resetDemo3Form()
  setupDemo3Form({ cubieSize: 25, cubieSpacing: 20 })

  const cube = new RubikCube(25, 3)

  clearScene()

  cube.cubies[0].render()
  render3dScene()

  assertEquals(paintedColours().toSorted(), ['green', 'red', 'white'])

  setupDemo3Form({
    cubieSize: 25,
    cubieSpacing: 20,
    renderExternalFacesOnly: true,
  })

  clearScene()

  cube.cubies[0].render()
  render3dScene()

  assertEquals(paintedColours().toSorted(), ['blue', 'orange', 'yellow'])
})

/**
 * Verifies that starting the demo creates its control panel, populates the
 * demo's form with the documented initial values, and that stopping the demo
 * removes the panel again.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Demo3 - Main: start creates the control panel, stop removes it', () => {
  resetDemo3Form()
  resetScene()

  const container = documentStub().getElementById('canvas-container')

  assert(container)

  stop()
  start()

  assertEquals(container.children.length, 1)

  assert(demo3Form.sliders)
  assert(demo3Form.toggles)

  assertEquals(cubiesPerAxis(), INITIAL_CUBIES_PER_AXIS)
  assertEquals(cubieSize(), INITIAL_CUBIE_SIZE)
  assertEquals(cubieSpacing(), INITIAL_CUBIE_SPACING)
  assertEquals(rotateCubies(), false)
  assertEquals(renderExternalFacesOnly(), false)

  stop()

  assertEquals(container.children.length, 0)
})

/**
 * Verifies that starting the demo renders a frame onto the canvas.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Demo3 - Main: the running demo paints the scene', () => {
  resetDemo3Form()
  resetScene()

  stop()
  start()

  flushAnimationFrames(1, 1000, 16)

  assert(recordedCalls('fill').length > 0)

  stop()
})
