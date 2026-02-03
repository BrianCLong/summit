import json
import os
import pytest
from summit.io.detectors.surge import detect_surge

FIXTURE_DIR = os.path.join(os.path.dirname(__file__), "..", "fixtures", "io")

def load_fixture(filename):
    with open(os.path.join(FIXTURE_DIR, filename), "r") as f:
        return json.load(f)

def test_surge_no_alert():
    data = load_fixture("pravda_surge_no_alert.json")
    # Mock registry loading by passing domains explicitly or mocking the file read
    domains = ["pravda-us.example.com"]
    alerts = detect_surge(data, "venezuela", domains=domains)
    assert len(alerts) == 0

def test_surge_alert():
    data = load_fixture("pravda_surge_alert.json")
    domains = ["pravda-us.example.com"]
    alerts = detect_surge(data, "venezuela", domains=domains)
    assert len(alerts) == 1
    assert alerts[0]["domain"] == "pravda-us.example.com"
