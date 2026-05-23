def coherence_length(lam_nm: float, fwhm_nm: float) -> float:
    """Lc = λ² / Δλ  (comprimento de coerência temporal)"""
    return (lam_nm**2) / fwhm_nm


def opd(d_nm: float, n: float = 1.31) -> float:
    """OPD = 2·n·d para incidência normal."""
    return 2 * n * d_nm


def check_coherence(lam_nm: float, fwhm_nm: float, d_max_nm: float = 300.0) -> dict:
    lc = coherence_length(lam_nm, fwhm_nm)
    opd_max = opd(d_max_nm)
    margin = lc / opd_max

    return {
        "lc_nm": round(lc, 1),
        "opd_max_nm": round(opd_max, 1),
        "margin": round(margin, 1),
        "ok": lc > opd_max,
        "message": (
            f"Lc = {lc:.0f} nm >> OPD_max = {opd_max:.0f} nm (margem {margin:.0f}×) — coerência garantida"
            if lc > opd_max
            else f"AVISO: Lc = {lc:.0f} nm < OPD_max = {opd_max:.0f} nm"
        ),
    }
