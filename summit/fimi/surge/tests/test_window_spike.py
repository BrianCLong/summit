# summit/fimi/surge/tests/test_window_spike.py
import pytest

from summit.fimi.surge.surge_detector import FIMISurgeDetector


def test_detect_surge():
    detector = FIMISurgeDetector()
    data = [
        {"timestamp": "2026-01-01", "volume": 10},
        {"timestamp": "2026-01-02", "volume": 12},
        {"timestamp": "2026-01-03", "volume": 50}, # Spike
        {"timestamp": "2026-01-04", "volume": 11}
    ]
    spikes = detector.detect_spikes(data, threshold=2.0)

    assert len(spikes) == 1
    assert spikes[0]["timestamp"] == "2026-01-03"
    assert spikes[0]["score"] > 2.0

def test_no_surge():
    detector = FIMISurgeDetector()
    data = [
        {"timestamp": "2026-01-01", "volume": 10},
        {"timestamp": "2026-01-02", "volume": 11},
        {"timestamp": "2026-01-03", "volume": 10}
    ]
    spikes = detector.detect_spikes(data, threshold=2.0)

    assert len(spikes) == 0
