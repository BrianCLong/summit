from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict, List

from .schema import DeepSearchQAItem


def load_dataset(path: str | Path) -> list[DeepSearchQAItem]:
    """
    Loads the DeepSearchQA dataset from a local JSON file.
    Does NOT vendor the dataset; expects a user-provided path.
    """
    path = Path(path)
    if not path.exists():
        raise FileNotFoundError(f"Dataset file not found at: {path}")

    with open(path, encoding="utf-8") as f:
        data = json.load(f)

    if not isinstance(data, list):
        raise ValueError("Dataset must be a JSON list of items.")

    validated_items: list[DeepSearchQAItem] = []
    for i, item in enumerate(data):
        try:
            validate_item(item)
            validated_items.append(item)
        except ValueError as e:
            raise ValueError(f"Validation failed for item at index {i}: {e}")

    return validated_items

def validate_item(item: Any) -> None:
    """
    Validates a single DeepSearchQA item against the internal schema.
    """
    if not isinstance(item, dict):
        raise ValueError("Item must be a dictionary.")

    required_keys = ["id", "prompt", "answer_type", "ground_truth"]
    for key in required_keys:
        if key not in item:
            raise ValueError(f"Missing required key: {key}")

    if item["answer_type"] not in ["single", "set"]:
        raise ValueError(f"Invalid answer_type: {item['answer_type']}. Must be 'single' or 'set'.")

    if not isinstance(item["ground_truth"], list):
        raise ValueError("ground_truth must be a list of strings.")

    for gt in item["ground_truth"]:
        if not isinstance(gt, str):
            raise ValueError("All ground_truth items must be strings.")

    if "metadata" in item and item["metadata"] is not None:
        metadata = item["metadata"]
        if not isinstance(metadata, dict):
            raise ValueError("metadata must be a dictionary.")
        if "domain" not in metadata:
            raise ValueError("metadata missing required key: domain")
        if "time_anchored" not in metadata:
            raise ValueError("metadata missing required key: time_anchored")
        if not isinstance(metadata["time_anchored"], bool):
            raise ValueError("metadata['time_anchored'] must be a boolean.")
