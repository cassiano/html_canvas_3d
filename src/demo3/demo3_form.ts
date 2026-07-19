import { createSlider, createToggle } from '../utils.ts'

type Demo3FormType = {
  sliders?: Record<
    'cubiesPerAxis' | 'cubieSize' | 'cubieSpacing',
    ReturnType<typeof createSlider>
  >
  toggles?: Record<
    'rotateCubies' | 'renderExternalFacesOnly' | 'rotateAroundXAndYAxes',
    ReturnType<typeof createToggle>
  >
}

export const demo3Form: Demo3FormType = {}

export const cubiesPerAxis = () => {
  return sliders().cubiesPerAxis.getValue()
}

export const cubieSize = () => {
  return sliders().cubieSize.getValue()
}

export const cubieSpacing = () => {
  return sliders().cubieSpacing.getValue()
}

export const rotateCubies = () => {
  return toggles().rotateCubies.getValue()
}

export const renderExternalFacesOnly = () => {
  return toggles().renderExternalFacesOnly.getValue()
}

export const rotateAroundXAndYAxes = () => {
  return toggles().rotateAroundXAndYAxes.getValue()
}

const sliders = () => {
  if (!demo3Form.sliders)
    throw new Error('demo3Form.sliders should contain a value')

  return demo3Form.sliders
}

const toggles = () => {
  if (!demo3Form.toggles)
    throw new Error('demo3Form.toggles should contain a value')

  return demo3Form.toggles
}
