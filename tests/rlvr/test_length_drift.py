from summit.rlvr.length_drift import detect_length_collapse


def test_length_drift_flags_collapse() -> None:
    lengths = [10, 9, 8, 7, 6, 5, 4]
    result = detect_length_collapse(
        lengths,
        window=3,
        slope_threshold=-0.1,
        drop_threshold=0.2,
    )
    assert result.collapse is True
    assert result.drop_pct >= 0.2


def test_length_drift_flags_overlong_gaming() -> None:
    lengths = [5, 6, 7, 50, 60, 55]
    result = detect_length_collapse(
        lengths,
        window=2,
        slope_threshold=-0.5,
        drop_threshold=0.5,
        max_len=20,
        overlong_ratio_threshold=0.2,
    )
    assert result.overlong_flag is True
