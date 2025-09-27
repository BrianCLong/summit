"""Command line interface for CSSM."""
from __future__ import annotations

import argparse
import json
import pathlib

from .cssm import CanonicalSemanticSchemaMapper


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Canonical Semantic Schema Mapper")
    parser.add_argument(
        "input",
        type=pathlib.Path,
        help="Path to the input JSON document containing system schemas",
    )
    parser.add_argument(
        "--ontology",
        type=pathlib.Path,
        default=None,
        help="Optional path to override the default ontology",
    )
    parser.add_argument(
        "--output",
        type=pathlib.Path,
        default=pathlib.Path("cssm_output"),
        help="Directory where artifacts will be written",
    )
    parser.add_argument(
        "--min-confidence",
        type=float,
        default=0.55,
        help="Minimum confidence floor applied to rule-backed matches",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    payload = json.loads(args.input.read_text())
    systems = payload.get("systems", [])

    mapper = CanonicalSemanticSchemaMapper.from_path(
        ontology_path=args.ontology, min_confidence=args.min_confidence
    )
    results = mapper.map_sources(systems)

    output_dir = args.output
    output_dir.mkdir(parents=True, exist_ok=True)

    (output_dir / "schema_annotations.json").write_text(
        json.dumps(results["schema_annotations"], indent=2, sort_keys=True)
    )
    (output_dir / "compatibility_matrix.json").write_text(
        json.dumps(results["compatibility_matrix"], indent=2, sort_keys=True)
    )
    (output_dir / "migration_aide.md").write_text(results["migration_aide"])


if __name__ == "__main__":
    main()
