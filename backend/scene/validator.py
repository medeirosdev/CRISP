import math
from .models import Scene, ComponentSpec, ComponentType


def _get(scene: Scene, *types: str) -> ComponentSpec | None:
    for c in scene.components:
        if c.type.value in types:
            return c
    return None


def _dist(a: ComponentSpec, b: ComponentSpec) -> float:
    return math.hypot(b.position.x_mm - a.position.x_mm,
                      b.position.y_mm - a.position.y_mm)


def validate_scene(scene: Scene) -> list[dict]:
    issues: list[dict] = []

    # 1. Fonte de luz
    if not _get(scene, "source_led", "source_laser"):
        issues.append({"level": "error", "message": "Nenhuma fonte de luz na cena"})

    # 2. Divisor de feixe
    bs = _get(scene, "beamsplitter", "dichroic")
    if not bs:
        issues.append({"level": "warning",
                       "message": "Nenhum divisor de feixe — caminho de retorno indefinido"})

    # 3. Distância de trabalho da objetiva
    obj = _get(scene, "objective")
    sample = _get(scene, "cryo_stage")
    if obj and sample:
        d = _dist(obj, sample)
        wd = obj.working_distance_mm or 34.0
        if abs(d - wd) > 2.0:
            issues.append({
                "level": "error",
                "message": f"Distância objetiva-amostra = {d:.1f} mm, WD = {wd:.1f} mm — fora de foco"
            })

    # 4. Aviso de eficiência do dicroico
    if bs and bs.type == ComponentType.DICHROIC:
        issues.append({
            "level": "warning",
            "message": f"Dicroico {bs.cutoff_nm} nm: canal 528 nm terá eficiência ~9% (vs 25% do BS 50/50)"
        })

    # 5. Correção cromática da objetiva
    source = _get(scene, "source_led", "source_laser")
    if obj and source:
        correction = obj.correction_type or "basic"
        n_wavelengths = len(source.wavelengths_nm)
        if n_wavelengths > 1 and correction == "basic":
            issues.append({
                "level": "warning",
                "message": "Objetiva sem correção cromática (basic) com múltiplos λ — "
                           "foco deslocado entre canais. Use Plan ou Plan Apo."
            })
        elif n_wavelengths > 1 and correction == "plan":
            issues.append({
                "level": "info",
                "message": "Objetiva Plan: correção cromática para λ visível (ok para 405–528 nm)"
            })

    # 6. NA muito baixa para resolução de furos do grid
    if obj:
        na = obj.na or 0.3
        lam_ref = 470.0
        resolution_nm = 0.61 * lam_ref / na * 1000  # em nm
        if resolution_nm > 2000:
            issues.append({
                "level": "warning",
                "message": f"Resolução {resolution_nm / 1000:.1f} µm (NA={na:.2f}) — "
                           "furos do grid (1–2 µm) podem não ser resolvidos"
            })

    # 7. Câmera
    if not _get(scene, "camera"):
        issues.append({"level": "info", "message": "Câmera não adicionada ao setup"})

    if not issues:
        issues.append({"level": "ok", "message": "Setup fisicamente consistente"})

    return issues
