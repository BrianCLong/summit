import json
import os
from pathlib import Path


def load_fixture(path: str):
    return json.loads(Path(path).read_text(encoding="utf-8"))

def run():
    # Attempt to locate tasks directory relative to this file
    base_dir = Path(__file__).parent / "tasks"
    if not base_dir.exists():
        # Fallback to repo root assumption
        base_dir = Path("summit/evals/tasks")

    debugging = load_fixture(str(base_dir / "debugging_fixtures.json"))
    reading = load_fixture(str(base_dir / "reading_fixtures.json"))
    conceptual = load_fixture(str(base_dir / "conceptual_fixtures.json"))

    return {
        "loaded": {
            "debugging": len(debugging),
            "reading": len(reading),
            "conceptual": len(conceptual)
        }
    }
