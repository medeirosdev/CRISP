import type { PhysicsResponse } from '../types/physics'

const N2_DEFAULT = 1.31
const L_NM = 1000
const D_STEP = 0.5

function r(d: number, lam: number, n2 = N2_DEFAULT): number {
  return 0.5 + 0.5 * Math.exp(-d / L_NM) * Math.cos(4 * Math.PI * n2 * d / lam + Math.PI)
}

function zone(dNm: number, lamNm: number, n2: number): 'monotonic' | 'ambiguous' | 'fringes' {
  if (dNm < lamNm / (4 * n2)) return 'monotonic'
  if (dNm < lamNm / (2 * n2)) return 'ambiguous'
  return 'fringes'
}

export function computeLocalPhysics(
  wavelengthsNm: number[],
  dTargetNm: number,
  dMaxNm = 300,
): PhysicsResponse {
  const thickness: number[] = []
  for (let d = 0; d <= dMaxNm + D_STEP / 2; d += D_STEP) thickness.push(d)

  const reflectivity = thickness.map(d => wavelengthsNm.map(lam => r(d, lam)))
  const rAtTarget = wavelengthsNm.map(lam => r(dTargetNm, lam))
  const lam0 = wavelengthsNm[0] ?? 470

  return {
    thickness_nm: thickness,
    reflectivity,
    r_at_target: rAtTarget,
    zone: zone(dTargetNm, lam0, N2_DEFAULT),
    opd_nm: 2 * N2_DEFAULT * dTargetNm,
    coherence: wavelengthsNm.map(lam => ({
      lc_nm: lam * lam / 15,
      opd_max_nm: 2 * N2_DEFAULT * dMaxNm,
      margin: 35,
      ok: true,
      message: '',
    })),
    efficiency: { total: 25 },
    validation: [],
    n_values: wavelengthsNm.map(() => N2_DEFAULT),
  }
}
