import numpy as np
from dataclasses import dataclass

N2_ICE_77K = 1.31
L_COHERENCE_NM = 1000.0


@dataclass
class ThinFilmResult:
    wavelengths_nm: list[float]
    thickness_nm: np.ndarray
    reflectivity: np.ndarray
    r_at_d: list[float]
    zone: str
    opd_nm: float


def reflectivity(
    d_nm: float | np.ndarray,
    lam_nm: float,
    n2: float = N2_ICE_77K,
    L: float = L_COHERENCE_NM,
) -> np.ndarray:
    """
    r(d, λ) = 1/2 + 1/2 · exp(-d/L) · cos(4π·n₂·d/λ + π)
    Ref: Last et al. J. Struct. Biol. 215, 107965 (2023)
    """
    phase = 4 * np.pi * n2 * d_nm / lam_nm + np.pi
    return 0.5 + 0.5 * np.exp(-d_nm / L) * np.cos(phase)


def sweep(
    wavelengths_nm: list[float],
    d_max_nm: float = 300.0,
    d_step_nm: float = 0.5,
    n2: float = N2_ICE_77K,
    d_target_nm: float | None = None,
) -> ThinFilmResult:
    d = np.arange(0, d_max_nm + d_step_nm / 2, d_step_nm)
    r = np.column_stack([reflectivity(d, lam, n2) for lam in wavelengths_nm])

    zone = "monotonic"
    r_at_d = []
    opd = 0.0

    if d_target_nm is not None:
        opd = 2 * n2 * d_target_nm
        d1 = wavelengths_nm[0] / (4 * n2)
        d2 = wavelengths_nm[0] / (2 * n2)

        if d_target_nm > d2:
            zone = "fringes"
        elif d_target_nm > d1:
            zone = "ambiguous"

        r_at_d = [float(reflectivity(d_target_nm, lam, n2)) for lam in wavelengths_nm]

    return ThinFilmResult(
        wavelengths_nm=wavelengths_nm,
        thickness_nm=d,
        reflectivity=r,
        r_at_d=r_at_d,
        zone=zone,
        opd_nm=opd,
    )


def spectral_sweep(
    wavelengths_nm: list[float],
    fwhm_nm: list[float],
    d_max_nm: float = 300.0,
) -> np.ndarray:
    """Sweep com integração espectral sobre perfil gaussiano de cada LED."""
    d = np.arange(0, d_max_nm + 0.5, 0.5)
    result = np.zeros((len(d), len(wavelengths_nm)))

    for i, (lam, fwhm) in enumerate(zip(wavelengths_nm, fwhm_nm)):
        sigma = fwhm / (2 * np.sqrt(2 * np.log(2)))
        lam_range = np.linspace(lam - 2 * fwhm, lam + 2 * fwhm, 40)
        weights = np.exp(-0.5 * ((lam_range - lam) / sigma) ** 2)
        weights /= weights.sum()
        r_integrated = sum(w * reflectivity(d, l) for w, l in zip(weights, lam_range))
        result[:, i] = r_integrated

    return result
