import numpy as np
from fastapi import APIRouter
from ..physics import thin_film, coherence
from ..utils.presets import PRESETS

router = APIRouter()


@router.get("/presets")
def list_presets():
    return list(PRESETS.keys())


@router.get("/presets/{name}")
def get_preset(name: str):
    if name not in PRESETS:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail=f"Preset '{name}' não encontrado")
    return PRESETS[name]


@router.get("/physics/reflectivity")
def get_reflectivity(
    lam_nm: float = 470.0,
    d_max_nm: float = 300.0,
    n2: float = 1.31,
):
    """Endpoint REST simples para obter curva r(d,λ) sem WebSocket."""
    d_arr = np.arange(0, d_max_nm + 0.25, 0.5)
    r = thin_film.reflectivity(d_arr, lam_nm, n2).tolist()
    return {"thickness_nm": d_arr.tolist(), "reflectivity": r}


@router.get("/physics/coherence")
def get_coherence(lam_nm: float = 470.0, fwhm_nm: float = 9.0, d_max_nm: float = 300.0):
    return coherence.check_coherence(lam_nm, fwhm_nm, d_max_nm)
