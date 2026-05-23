from fastapi import WebSocket
from ..physics import thin_film, coherence, refractive_index
from ..physics.efficiency import collection_efficiency
from ..scene.models import PhysicsRequest, PhysicsResponse
from ..scene.validator import validate_scene


async def handle_physics_update(websocket: WebSocket, data: dict):
    try:
        req = PhysicsRequest(**data)
        scene = req.scene

        # 1. Índice de refração por λ
        if req.use_kofman_n:
            n_vals = [refractive_index.n_ice_77k(lam) for lam in req.wavelengths_nm]
        else:
            n_vals = [1.31] * len(req.wavelengths_nm)

        # 2. Sweep de refletividade
        result = thin_film.sweep(
            wavelengths_nm=req.wavelengths_nm,
            d_max_nm=req.d_max_nm,
            d_target_nm=req.d_target_nm,
            n2=n_vals[1],
        )

        # 3. Verificação de coerência
        coh = [
            coherence.check_coherence(lam, fwhm, req.d_max_nm)
            for lam, fwhm in zip(req.wavelengths_nm, req.fwhm_nm)
        ]

        # 4. Eficiência do divisor de feixe
        eff = _calc_efficiency(scene, req.wavelengths_nm)

        # 5. Validação da cena
        validation = validate_scene(scene)

        response = PhysicsResponse(
            thickness_nm=result.thickness_nm.tolist(),
            reflectivity=result.reflectivity.tolist(),
            r_at_target=result.r_at_d,
            zone=result.zone,
            opd_nm=result.opd_nm,
            coherence=coh,
            efficiency=eff,
            validation=validation,
            n_values=n_vals,
        )

        await websocket.send_json(response.model_dump())

    except Exception as e:
        await websocket.send_json({"error": str(e)})


def _calc_efficiency(scene, wavelengths_nm: list[float]) -> dict:
    bs = next(
        (c for c in scene.components if c.type.value in ("beamsplitter", "dichroic")),
        None,
    )
    if bs is None:
        return {}

    return {
        f"{lam:.0f}nm": collection_efficiency(
            splitter_type=bs.type.value,
            reflectance=bs.reflectance or 0.5,
            cutoff_nm=bs.cutoff_nm or 505,
            lam_nm=lam,
        )
        for lam in wavelengths_nm
    }
