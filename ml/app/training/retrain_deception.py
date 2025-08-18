import json
from pathlib import Path

from intelgraph.deception_detector import DeceptionDetector


def load_feedback(path: str = "feedback/deception.jsonl"):
    texts, labels = [], []
    p = Path(path)
    if p.exists():
        for line in p.read_text().splitlines():
            obj = json.loads(line)
            texts.append(obj["text"])
            labels.append(1 if obj["label"] == "false_positive" else 0)
    return texts, labels


def main():
    texts, labels = load_feedback()
    if not texts:
        print("No feedback provided; skipping retrain")
        return
    detector = DeceptionDetector()
    detector.train(texts, labels)
    print("Deception model retrained")


if __name__ == "__main__":
    main()
