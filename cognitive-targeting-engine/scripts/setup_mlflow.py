#!/usr/bin/env python3
"""Bootstrap MLflow tracking and register a Hugging Face model snapshot."""

import argparse
import os
import sys
from pathlib import Path

# Ensure the project package is importable when running from repository root.
PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.append(str(PROJECT_ROOT))

from mlflow_tracking import register_model_version  # noqa: E402


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("model_name", help="Registered model name inside MLflow")
    parser.add_argument("hf_model", help="Hugging Face model identifier (e.g. org/model)")
    parser.add_argument(
        "--hf-revision",
        dest="hf_revision",
        help="Optional Hugging Face revision or commit hash",
    )
    parser.add_argument(
        "--description",
        dest="description",
        help="Optional description for the registered model version",
    )
    parser.add_argument(
        "--tracking-uri",
        dest="tracking_uri",
        help="Override the MLflow tracking URI (defaults to local file store)",
    )
    parser.add_argument(
        "--tag",
        action="append",
        dest="tags",
        default=[],
        help="Additional model tags in KEY=VALUE form",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()

    if args.tracking_uri:
        os.environ["MLFLOW_TRACKING_URI"] = args.tracking_uri

    tag_dict = {}
    for tag in args.tags:
        if "=" not in tag:
            raise SystemExit(f"Invalid tag '{tag}'. Expected KEY=VALUE format.")
        key, value = tag.split("=", 1)
        tag_dict[key] = value

    version, run_id = register_model_version(
        registered_name=args.model_name,
        hf_model=args.hf_model,
        hf_revision=args.hf_revision,
        description=args.description,
        extra_tags=tag_dict,
    )

    print(f"Registered {args.model_name} version {version} (run_id={run_id})")


if __name__ == "__main__":
    main()
