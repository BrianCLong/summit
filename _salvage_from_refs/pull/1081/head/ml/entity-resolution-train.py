"""Retrain entity resolution embeddings using user feedback."""

from __future__ import annotations

import json
from pathlib import Path

from sentence_transformers import SentenceTransformer


def load_feedback(path: Path):
    if not path.exists():
        return []
    return json.loads(path.read_text())


def train(output_model: Path, feedback_path: Path = Path("feedback.json")):
    feedback = load_feedback(feedback_path)
    model = SentenceTransformer("paraphrase-MiniLM-L6-v2")
    # Placeholder: Fine-tuning would occur here using feedback
    model.save(str(output_model))
    print(f"Model saved to {output_model}")


if __name__ == "__main__":
    train(Path("trained-model"))
