export const PX_PER_MM = 4  // escala padrão: 4 px = 1 mm

export const mmToPx = (mm: number, scale = 1) => mm * PX_PER_MM * scale
export const pxToMm = (px: number, scale = 1) => px / (PX_PER_MM * scale)

export const snapToGrid = (mm: number, gridMm = 25) =>
  Math.round(mm / gridMm) * gridMm

export const dist2D = (ax: number, ay: number, bx: number, by: number) =>
  Math.hypot(bx - ax, by - ay)
