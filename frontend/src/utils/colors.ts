export const WAVELENGTH_COLORS: Record<number, string> = {
  405: '#9933ff',
  470: '#3399ff',
  528: '#33cc66',
  530: '#33cc66',
}

export function wavelengthToRgba(nm: number, alpha = 1): string {
  if (nm <= 410) return `rgba(153, 51, 255, ${alpha})`
  if (nm <= 480) return `rgba(51, 153, 255, ${alpha})`
  if (nm <= 540) return `rgba(51, 204, 102, ${alpha})`
  return `rgba(255, 80, 80, ${alpha})`
}

export const COMPONENT_COLORS: Record<string, string> = {
  source_led:    '#f5a623',
  source_laser:  '#e74c3c',
  beamsplitter:  '#3498db',
  dichroic:      '#9b59b6',
  objective:     '#2ecc71',
  camera:        '#1abc9c',
  cryo_stage:    '#4a90d9',
  mirror:        '#95a5a6',
  filter_bandpass: '#e67e22',
  filter_nd:     '#7f8c8d',
  iris:          '#bdc3c7',
  lens:          '#27ae60',
  post:          '#95a5a6',
}
