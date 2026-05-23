import math


def collection_efficiency(splitter_type: str, reflectance: float = 0.5,
                          cutoff_nm: float = 505, lam_nm: float = 470) -> float:
    """
    Eficiência de coleta ida-e-volta: R (iluminação) × T (detecção).
    BS 50/50: R×T = 0.5×0.5 = 25%
    Dicroico:  λ < cutoff → R=0.9, T=0.1 → 9%
    """
    if splitter_type == "beamsplitter":
        R = reflectance
    else:
        R = 0.90 if lam_nm < cutoff_nm else 0.10
    T = 1 - R
    return round(R * T * 100, 1)


def effective_na(obj_na: float, iris_diameter_mm: float | None,
                 focal_length_mm: float) -> float:
    """NA efetiva considerando íris opcional no caminho."""
    if iris_diameter_mm is None:
        return obj_na
    theta = math.atan(iris_diameter_mm / (2 * focal_length_mm))
    return min(obj_na, math.sin(theta))


def fov_mm(sensor_size_mm: float, working_distance_mm: float,
           focal_length_mm: float) -> float:
    """Campo de visão no plano da amostra."""
    return sensor_size_mm * (working_distance_mm / focal_length_mm)
