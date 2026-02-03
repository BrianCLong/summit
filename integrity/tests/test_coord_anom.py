from integrity.detectors.coord_anom import detect


def test_coord_negative_fixture():
    sig = {"bursts_per_minute": {0: 3, 1: 2}}
    assert detect(sig) == []

def test_coord_positive_fixture():
    sig = {"bursts_per_minute": {0: 60}}
    out = detect(sig)
    assert len(out) == 1
    assert out[0].detector == "coord_anom"
