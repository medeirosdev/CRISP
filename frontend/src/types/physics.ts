export interface CoherenceResult {
  lc_nm: number
  opd_max_nm: number
  margin: number
  ok: boolean
  message: string
}

export interface ValidationItem {
  level: 'ok' | 'info' | 'warning' | 'error'
  message: string
}

export interface PhysicsResponse {
  thickness_nm: number[]
  reflectivity: number[][]    // shape [N_d, N_lambda]
  r_at_target: number[]
  zone: 'monotonic' | 'ambiguous' | 'fringes'
  opd_nm: number
  coherence: CoherenceResult[]
  efficiency: Record<string, number>
  validation: ValidationItem[]
  n_values: number[]
}
