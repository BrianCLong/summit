"""Process feedback to improve copilot prompting."""

import json
from pathlib import Path


def load_feedback(path: str) -> list:
    return json.loads(Path(path).read_text())


def main() -> None:
    feedback = load_feedback("feedback/copilot_ratings.json")
    high_rated = [f for f in feedback if f.get("rating") == "up"]
    print(f"Loaded {len(high_rated)} high-rated samples for training.")


if __name__ == "__main__":
    main()
