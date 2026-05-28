import type { PhysicsResponse } from '../types/physics'

export const N2_DEFAULT = 1.310
const L_NM = 1000
const D_STEP = 0.5

/**
 * Índice de refração do gelo em função da temperatura.
 * Baseado em Kofman 2019 (77K, amorfos) e Warren 1984 (gelo cristalino).
 *
 * Fases:
 *  77–130 K  — Gelo vítreo (amorfos):   n ≈ 1.310, diminui levemente
 *  130–150 K — Zona de devitrificação:   transição amorfo → cristalino
 *  150–273 K — Gelo cristalino (Ih):     n ≈ 1.308, quase constante
 *  > 273 K   — Água líquida:             n ≈ 1.333
 */
export function nFromTemp(T: number): number {
  if (T <= 130) return 1.310 - 0.002 * (T - 77) / 53
  if (T <= 150) return 1.308
  if (T <= 273) return 1.308 + 0.001 * (T - 150) / 123
  return 1.333
}

export function phaseLabel(T: number): string {
  if (T <= 130) return 'Gelo vítreo'
  if (T <= 150) return 'Devitrificação (~150 K)'
  if (T <= 273) return 'Gelo cristalino'
  return 'Água líquida'
}

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
  n2Override?: number,
): PhysicsResponse {
  const n2 = n2Override ?? N2_DEFAULT
  const thickness: number[] = []
  for (let d = 0; d <= dMaxNm + D_STEP / 2; d += D_STEP) thickness.push(d)

  const reflectivity = thickness.map(d => wavelengthsNm.map(lam => r(d, lam, n2)))
  const rAtTarget = wavelengthsNm.map(lam => r(dTargetNm, lam, n2))
  const lam0 = wavelengthsNm[0] ?? 470

  return {
    thickness_nm: thickness,
    reflectivity,
    r_at_target: rAtTarget,
    zone: zone(dTargetNm, lam0, n2),
    opd_nm: 2 * n2 * dTargetNm,
    coherence: wavelengthsNm.map(lam => ({
      lc_nm: lam * lam / 15,
      opd_max_nm: 2 * n2 * dMaxNm,
      margin: 35,
      ok: true,
      message: '',
    })),
    efficiency: { total: 25 },
    validation: [],
    n_values: wavelengthsNm.map(() => n2),
  }
}
