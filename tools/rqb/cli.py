"""Command line entrypoints for the RQB toolkit."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Dict, Type

from .detectors import Detector, MLStubDetector, RegexDetector
from .evaluation import BenchmarkHarness
from .scorecard import export_scorecard


_DETECTOR_FACTORIES: Dict[str, Type[Detector]] = {
    "regex": RegexDetector,
    "ml-stub": MLStubDetector,
}


def build_detector(name: str) -> Detector:
    try:
        detector_cls = _DETECTOR_FACTORIES[name]
    except KeyError as exc:  # pragma: no cover - argparse protects this, but keep explicit message.
        raise ValueError(f"Unknown detector '{name}'") from exc
    return detector_cls()


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Run the Redaction Quality Benchmark (RQB)")
    parser.add_argument("--detector", choices=sorted(_DETECTOR_FACTORIES), default="regex")
    parser.add_argument("--seed", type=int, default=1337, help="Seed for deterministic detectors")
    parser.add_argument("--scorecard", type=Path, help="Optional path to write a JSON scorecard")
    args = parser.parse_args(argv)

    detector = build_detector(args.detector)
    harness = BenchmarkHarness(seed=args.seed)
    result = harness.run(detector)

    payload = result.to_dict()
    print(json.dumps(payload, indent=2, sort_keys=True))
    if args.scorecard:
        export_scorecard(result, args.scorecard)
        print(f"Scorecard written to {args.scorecard}")
    return 0


if __name__ == "__main__":  # pragma: no cover
    raise SystemExit(main())
