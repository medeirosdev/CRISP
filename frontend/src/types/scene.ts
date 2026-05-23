export type ComponentType =
  | 'source_led' | 'source_laser' | 'mirror' | 'beamsplitter'
  | 'dichroic' | 'lens' | 'objective' | 'camera'
  | 'filter_bandpass' | 'filter_nd' | 'cryo_stage' | 'iris' | 'post'

export type CorrectionType = 'basic' | 'plan' | 'plan_apo'

export interface Position {
  xMm: number
  yMm: number
}

export interface Component {
  id: string
  type: ComponentType
  position: Position
  angleDeg: number
  label?: string
  // fonte
  wavelengthsNm?: number[]
  fwhmNm?: number[]
  // objetiva
  focalLengthMm?: number
  na?: number
  workingDistanceMm?: number
  magnification?: number
  correctionType?: CorrectionType
  // câmera
  sensorWidthMm?: number
  sensorHeightMm?: number
  // óptica geral
  reflectance?: number
  cutoffNm?: number
  od?: number
  diameterMm?: number
  thorlabsPn?: string
}

export interface Scene {
  id: string
  name: string
  description: string
  tableWidthMm: number
  tableHeightMm: number
  gridSpacingMm: number
  components: Component[]
}

export function componentFromBackend(raw: Record<string, unknown>): Component {
  const pos = raw.position as Record<string, number>
  return {
    id: raw.id as string,
    type: raw.type as ComponentType,
    position: { xMm: pos.x_mm, yMm: pos.y_mm },
    angleDeg: (raw.angle_deg as number) ?? 0,
    label: raw.label as string | undefined,
    wavelengthsNm: raw.wavelengths_nm as number[] | undefined,
    fwhmNm: raw.fwhm_nm as number[] | undefined,
    na: raw.na as number | undefined,
    workingDistanceMm: raw.working_distance_mm as number | undefined,
    focalLengthMm: raw.focal_length_mm as number | undefined,
    magnification: raw.magnification as number | undefined,
    correctionType: raw.correction_type as CorrectionType | undefined,
    sensorWidthMm: raw.sensor_width_mm as number | undefined,
    sensorHeightMm: raw.sensor_height_mm as number | undefined,
    reflectance: raw.reflectance as number | undefined,
    cutoffNm: raw.cutoff_nm as number | undefined,
    thorlabsPn: raw.thorlabs_pn as string | undefined,
  }
}

export function sceneToBackend(scene: Scene) {
  return {
    id: scene.id,
    name: scene.name,
    description: scene.description,
    table_width_mm: scene.tableWidthMm,
    table_height_mm: scene.tableHeightMm,
    grid_spacing_mm: scene.gridSpacingMm,
    components: scene.components.map(c => ({
      id: c.id,
      type: c.type,
      position: { x_mm: c.position.xMm, y_mm: c.position.yMm },
      angle_deg: c.angleDeg,
      label: c.label,
      wavelengths_nm: c.wavelengthsNm ?? [],
      fwhm_nm: c.fwhmNm ?? [],
      na: c.na,
      working_distance_mm: c.workingDistanceMm,
      focal_length_mm: c.focalLengthMm,
      magnification: c.magnification,
      correction_type: c.correctionType,
      sensor_width_mm: c.sensorWidthMm,
      sensor_height_mm: c.sensorHeightMm,
      reflectance: c.reflectance,
      cutoff_nm: c.cutoffNm,
      thorlabs_pn: c.thorlabsPn,
    })),
  }
}
