import pytest
import json
import os
from summit.osint.inflection import InflectionMetric

def test_inflection_metrics_simple():
    # Linear growth: vel constant, accel 0
    data = [
        {"timestamp": "1", "value": 10},
        {"timestamp": "2", "value": 20},
        {"timestamp": "3", "value": 30},
        {"timestamp": "4", "value": 40}
    ]
    metric = InflectionMetric(data)
    result = metric.compute()

    assert result["metrics"]["velocity"] == 10.0
    assert result["metrics"]["acceleration"] == 0.0
    assert result["inflection_point"] is False

def test_inflection_metrics_acceleration():
    # Accelerating: 10, 12 (+2), 15 (+3), 19 (+4)
    data = [
        {"timestamp": "1", "value": 10},
        {"timestamp": "2", "value": 12},
        {"timestamp": "3", "value": 15},
        {"timestamp": "4", "value": 19}
    ]
    metric = InflectionMetric(data)
    result = metric.compute()

    assert result["metrics"]["velocity"] == 4.0
    assert result["metrics"]["acceleration"] == 1.0 # 4 - 3 = 1
    assert result["inflection_point"] is False

def test_inflection_point_detection():
    # Inflection: Concave up to Concave down
    # Values: 0, 1, 4, 9, 12, 13
    # Vel:    1, 3, 5, 3, 1
    # Accel:    2, 2, -2, -2
    data = [
        {"timestamp": "1", "value": 0},
        {"timestamp": "2", "value": 1},
        {"timestamp": "3", "value": 4},
        {"timestamp": "4", "value": 9},
        {"timestamp": "5", "value": 12},
        {"timestamp": "6", "value": 13}
    ]
    metric = InflectionMetric(data)
    result = metric.compute()

    # At end:
    # Vel: 13-12=1
    # Prev Vel: 12-9=3
    # Accel: 1-3=-2
    # Prev Accel: 3-5=-2

    # Wait, the inflection happens when accel changes sign.
    # Let's check intermediate steps manually
    # Accel sequence: 2, 2, -2, -2
    # Sign change happens at index 2 (between 2 and -2).
    # But the "latest" check only looks at the LAST two points of acceleration?
    # result["inflection_point"] checks acceleration[-1] * acceleration[-2] < 0

    # In this data:
    # accel[-1] = -2
    # accel[-2] = -2
    # So NO inflection at the very end.

    assert result["inflection_point"] is False

    # Let's construct one that HAS an inflection at the end
    # Accel: 2, -2
    # Vel: 0, 2, 4 (accel 2), 4 (accel 0? no), 2 (accel -2)
    # Values: 0, 2, 6, 8
    # Vel: 2, 4, 2
    # Accel: 2, -2

    data_inflection = [
        {"timestamp": "1", "value": 0},
        {"timestamp": "2", "value": 2},
        {"timestamp": "3", "value": 6},
        {"timestamp": "4", "value": 8}
    ]
    metric = InflectionMetric(data_inflection)
    result = metric.compute()

    assert result["metrics"]["acceleration"] == -2.0
    # accel[-1] = -2
    # accel[-2] = (4-2) - (2-0)? No.
    # Vels: 2, 4, 2
    # Accels: (4-2)=2, (2-4)=-2.
    # So yes, 2 * -2 < 0.

    assert result["inflection_point"] is True

def test_fixture_loading():
    fixture_path = os.path.join(os.path.dirname(__file__), "../fixtures/inflection/simple_series.json")
    if os.path.exists(fixture_path):
        with open(fixture_path, 'r') as f:
            data = json.load(f)
        metric = InflectionMetric(data)
        result = metric.compute()
        assert "velocity" in result["metrics"]
