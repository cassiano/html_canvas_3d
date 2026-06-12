import { createSlider, createToggle } from '../utils.ts'

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

export const demo3Form: Demo3FormType = {}

export class Demo3FormReader {
  static get cubiesPerAxis() {
    return this.sliders.cubiesPerAxis.getValue()
  }

  static get cubieSize() {
    return this.sliders.cubieSize.getValue()
  }

  static get cubieSpacing() {
    return this.sliders.cubieSpacing.getValue()
  }

  static get rotateCubies() {
    return this.toggles.rotateCubies.getValue()
  }

  static get renderExternalFacesOnly() {
    return this.toggles.renderExternalFacesOnly.getValue()
  }

  private static get sliders() {
    if (!demo3Form.sliders)
      throw new Error('demo3Form.sliders should contain a value')

    return demo3Form.sliders
  }

  private static get toggles() {
    if (!demo3Form.toggles)
      throw new Error('demo3Form.toggles should contain a value')

    return demo3Form.toggles
  }
}
