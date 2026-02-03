import json
from pathlib import Path

import pytest

from summit.benchmarks.deepsearchqa.adapter_kaggle import load_dataset, validate_item


def test_validate_item_valid():
    item = {
        "id": "1",
        "prompt": "test",
        "answer_type": "set",
        "ground_truth": ["a", "b"],
        "metadata": {"domain": "test", "time_anchored": True}
    }
    validate_item(item)  # Should not raise

def test_validate_item_invalid_type():
    with pytest.raises(ValueError, match="answer_type"):
        validate_item({
            "id": "1",
            "prompt": "test",
            "answer_type": "invalid",
            "ground_truth": ["a"]
        })

def test_load_dataset(tmp_path):
    data = [
        {
            "id": "1",
            "prompt": "test",
            "answer_type": "set",
            "ground_truth": ["a"]
        }
    ]
    p = tmp_path / "test.json"
    p.write_text(json.dumps(data))

    loaded = load_dataset(p)
    assert len(loaded) == 1
    assert loaded[0]["id"] == "1"

def test_load_fixture():
    fixture_path = Path(__file__).parent.parent / "fixtures" / "tiny_public_sample.json"
    loaded = load_dataset(fixture_path)
    assert len(loaded) == 2
    assert loaded[0]["id"] == "test-1"
