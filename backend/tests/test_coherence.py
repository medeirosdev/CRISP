from backend.physics.coherence import coherence_length, check_coherence


def test_coherence_length_528():
    lc = coherence_length(528, 15)
    assert abs(lc - 528**2 / 15) < 1


def test_check_coherence_led_ok():
    result = check_coherence(528, 15, d_max_nm=300)
    assert result["ok"] is True
    assert result["margin"] > 20


def test_check_coherence_white_light_fail():
    # Luz branca sem filtro: FWHM ≈ 1000 nm → Lc = 528²/1000 ≈ 279 nm < OPD_max 786 nm
    result = check_coherence(528, 1000, d_max_nm=300)
    assert result["ok"] is False
