import numpy as np
from scipy.interpolate import interp1d

# Kofman et al. 2019 (ApJ 875, 131) — gelo amorfo a 80 K, 210–757 nm
_KOFMAN_LAM = np.array([210, 250, 300, 350, 400, 405, 450, 470, 500,
                         528, 550, 600, 650, 700, 757], dtype=float)
_KOFMAN_N   = np.array([1.38, 1.36, 1.345, 1.335, 1.325, 1.323, 1.318,
                         1.315, 1.312, 1.310, 1.308, 1.305, 1.303, 1.301, 1.299])

_n_interp = interp1d(_KOFMAN_LAM, _KOFMAN_N, kind="cubic", fill_value="extrapolate")


def n_ice_77k(lam_nm: float | np.ndarray) -> float:
    """
    Índice de refração do gelo vítreo a 77 K por interpolação cúbica (Kofman 2019).
    n(405) ≈ 1.323 | n(470) ≈ 1.315 | n(528) ≈ 1.310
    """
    return float(_n_interp(lam_nm))


def n_sensitivity_analysis(lam_nm: float, d_nm: float, dn: float = 0.01) -> float:
    """Sensibilidade de r ao erro em n₂: |Δr/Δn| no ponto (d, λ)."""
    n = n_ice_77k(lam_nm)
    r_base = _r(d_nm, lam_nm, n)
    r_perturbed = _r(d_nm, lam_nm, n + dn)
    return abs(r_perturbed - r_base) / dn


def _r(d: float, lam: float, n: float) -> float:
    return 0.5 + 0.5 * np.exp(-d / 1000) * np.cos(4 * np.pi * n * d / lam + np.pi)
