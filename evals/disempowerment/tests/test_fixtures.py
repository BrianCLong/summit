import json
from pathlib import Path

import pytest

FIXTURE_DIR = Path(__file__).parents[1] / "fixtures"

def test_negative_fixtures_exist():
    neg_dir = FIXTURE_DIR / "negative"
    files = list(neg_dir.glob("*.json"))
    assert len(files) > 0, "Should have negative fixtures"

def test_positive_fixtures_exist():
    pos_dir = FIXTURE_DIR / "positive"
    files = list(pos_dir.glob("*.json"))
    assert len(files) > 0, "Should have positive fixtures"

def test_fixture_structure():
    # Check one negative fixture
    neg_file = list((FIXTURE_DIR / "negative").glob("*.json"))[0]
    data = json.loads(neg_file.read_text())
    assert "id" in data
    assert "prompt" in data
    assert "bad_response_example" in data

    # Check one positive fixture
    pos_file = list((FIXTURE_DIR / "positive").glob("*.json"))[0]
    data = json.loads(pos_file.read_text())
    assert "id" in data
    assert "prompt" in data
    assert "good_response_example" in data
