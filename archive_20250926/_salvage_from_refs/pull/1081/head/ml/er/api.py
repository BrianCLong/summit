"""CLI shim exposing the ER pipeline."""

import json
import sys

from .pipeline import ERPipeline

API_VERSION = "1.0"


def main() -> None:
    if len(sys.argv) != 3:
        print("{}".format(json.dumps({"error": "usage: api.py <a> <b>"})))
        return
    a, b = sys.argv[1], sys.argv[2]
    records: dict[str, str] = {"a": a, "b": b}
    pipeline = ERPipeline()
    pipeline.fit(records)
    score, explanation = pipeline.score_pair("a", "b")
    match = score >= pipeline.threshold
    output = {
        "version": API_VERSION,
        "score": score,
        "match": match,
        "explanation": explanation,
    }
    print(json.dumps(output))


if __name__ == "__main__":
    main()
