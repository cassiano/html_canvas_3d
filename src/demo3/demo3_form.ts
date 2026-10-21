import { createSlider, createToggle } from '../utils.ts'

/**
 * The shape of the demo's form state.
 *
 * Both collections are optional because they only exist once the demo has
 * created its control panel.
 */
type Demo3FormType = {
  sliders?: Record<
    'cubiesPerAxis' | 'cubieSize' | 'cubieSpacing',
    ReturnType<typeof createSlider>
  >
  toggles?: Record<
    'rotateCubies' | 'renderExternalFacesOnly',
    ReturnType<typeof createToggle>
  >
}

/**
 * The mutable state of the demo's control panel.
 *
 * The demo fills the `sliders` and `toggles` collections when it creates its
 * control panel, and the accessor functions below read the values held by
 * them.
 */
export const demo3Form: Demo3FormType = {}

/**
 * Returns the number of cubies along each axis of the cube.
 *
 * @returns The current value of the "cubies per axis" slider.
 * @throws {Error} With the message `demo3Form.sliders should contain a value`
 *   when the demo's sliders have not been created yet.
 */
export const cubiesPerAxis = () => sliders().cubiesPerAxis.getValue()

/**
 * Returns the edge length of a single cubie.
 *
 * @returns The current value of the "cubie size" slider.
 * @throws {Error} With the message `demo3Form.sliders should contain a value`
 *   when the demo's sliders have not been created yet.
 */
export const cubieSize = () => sliders().cubieSize.getValue()

/**
 * Returns the gap between two neighbouring cubies.
 *
 * @returns The current value of the "cubie spacing" slider.
 * @throws {Error} With the message `demo3Form.sliders should contain a value`
 *   when the demo's sliders have not been created yet.
 */
export const cubieSpacing = () => sliders().cubieSpacing.getValue()

/**
 * Tells whether the cubies should spin around their own centers.
 *
 * @returns The current state of the "Rotate cubies?" toggle.
 * @throws {Error} With the message `demo3Form.toggles should contain a value`
 *   when the demo's toggles have not been created yet.
 */
export const rotateCubies = () => toggles().rotateCubies.getValue()

/**
 * Tells whether only the faces on the outside of the cube should be drawn.
 *
 * @returns The current state of the "Render external faces only?" toggle.
 * @throws {Error} With the message `demo3Form.toggles should contain a value`
 *   when the demo's toggles have not been created yet.
 */
export const renderExternalFacesOnly = () =>
  toggles().renderExternalFacesOnly.getValue()

/**
 * Returns the sliders of the demo's control panel.
 *
 * @returns The sliders currently held by the demo's form state.
 * @throws {Error} With the message `demo3Form.sliders should contain a value`
 *   when the demo's sliders have not been created yet.
 */
const sliders = () => {
  if (!demo3Form.sliders)
    throw new Error('demo3Form.sliders should contain a value')

  return demo3Form.sliders
}

/**
 * Returns the toggles of the demo's control panel.
 *
 * @returns The toggles currently held by the demo's form state.
 * @throws {Error} With the message `demo3Form.toggles should contain a value`
 *   when the demo's toggles have not been created yet.
 */
const toggles = () => {
  if (!demo3Form.toggles)
    throw new Error('demo3Form.toggles should contain a value')

  return demo3Form.toggles
}
