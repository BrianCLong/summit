import json
import os
import pytest
from summit.io.detectors.contradiction import detect_contradictions

FIXTURE_DIR = os.path.join(os.path.dirname(__file__), "..", "fixtures", "io")

def load_fixture(filename):
    with open(os.path.join(FIXTURE_DIR, filename), "r") as f:
        return json.load(f)

def test_contradiction_positive():
    data = load_fixture("contradiction_positive.json")
    alerts = detect_contradictions(data)
    assert len(alerts) == 1
    assert alerts[0]["media_hash"] == "hash123"
    assert alerts[0]["stance_a"] != alerts[0]["stance_b"]

def test_contradiction_negative():
    data = load_fixture("contradiction_negative.json")
    alerts = detect_contradictions(data)
    assert len(alerts) == 0
