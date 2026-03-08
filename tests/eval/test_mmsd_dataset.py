import json
from pathlib import Path

import pytest

from summit.eval.mmsd.dataset import MMSD2Dataset


def test_mmsd_dataset_loading(tmp_path):
    # Setup dummy dataset
    root = tmp_path / "mmsd_data"
    root.mkdir()
    images_dir = root / "images"
    images_dir.mkdir()

    # Create dummy images
    (images_dir / "img1.jpg").touch()
    (images_dir / "img2.jpg").touch()

    # Create test.json
    data = [
        {"text": "sarcastic text", "label": 1, "image_id": "img1.jpg"},
        {"text": "normal text", "label": 0, "image_id": "img2"} # Missing extension in ID
    ]
    with open(root / "test.json", "w") as f:
        json.dump(data, f)

    # Initialize adapter
    dataset = MMSD2Dataset(root, split="test")

    assert len(dataset) == 2

    item0 = dataset[0]
    assert item0["text"] == "sarcastic text"
    assert item0["label"] == 1
    assert item0["image_path"].endswith("img1.jpg")

    item1 = dataset[1]
    assert item1["text"] == "normal text"
    assert item1["label"] == 0
    # Check if extension resolution worked
    assert item1["image_path"].endswith("img2.jpg")

def test_mmsd_dataset_missing_root():
    with pytest.raises(FileNotFoundError, match="Dataset root directory not found"):
        MMSD2Dataset("/non/existent/path")

def test_mmsd_dataset_missing_images(tmp_path):
    root = tmp_path / "mmsd_data"
    root.mkdir()
    # Create json but no images dir
    with open(root / "test.json", "w") as f:
        json.dump([], f)

    with pytest.raises(FileNotFoundError, match="Images directory not found"):
        MMSD2Dataset(root)

def test_mmsd_dataset_missing_json(tmp_path):
    root = tmp_path / "mmsd_data"
    root.mkdir()
    (root / "images").mkdir()

    with pytest.raises(FileNotFoundError, match="Data file not found"):
        MMSD2Dataset(root)
