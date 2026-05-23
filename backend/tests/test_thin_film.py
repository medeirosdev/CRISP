import numpy as np
import pytest
from backend.physics.thin_film import reflectivity, sweep


def test_reflectivity_at_zero():
    # d=0: exp(0)=1, cos(π)=-1 → r = 0.5 + 0.5×1×(-1) = 0
    r = reflectivity(0.0, 470.0)
    assert abs(r - 0.0) < 1e-10


def test_reflectivity_range():
    d = np.linspace(0, 300, 1000)
    r = reflectivity(d, 470.0)
    assert np.all(r >= 0) and np.all(r <= 1)


def test_sweep_shape():
    result = sweep([405, 470, 528], d_max_nm=300.0, d_step_nm=0.5)
    assert result.reflectivity.shape[1] == 3
    assert len(result.thickness_nm) == result.reflectivity.shape[0]


def test_sweep_zone_fringes():
    result = sweep([470], d_max_nm=300, d_target_nm=200)
    assert result.zone == "fringes"


def test_sweep_zone_monotonic():
    result = sweep([470], d_max_nm=300, d_target_nm=20)
    assert result.zone == "monotonic"
