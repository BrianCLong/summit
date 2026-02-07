import argparse
from pathlib import Path
from typing import List

from summit.promptpacks.serious_client_tone.runner import run_fixtures, write_bundle


def main() -> int:
    parser = argparse.ArgumentParser(description="Summit prompt pack runner")
    subparsers = parser.add_subparsers(dest="command", required=True)

    promptpack_parser = subparsers.add_parser("promptpack", help="Run a prompt pack")
    promptpack_parser.add_argument("pack_id", help="Prompt pack id")
    promptpack_parser.add_argument("--input", nargs="+", required=True)
    promptpack_parser.add_argument(
        "--out-dir",
        default="artifacts/serious_client_tone",
        help="Output directory for artifacts",
    )

    args = parser.parse_args()

    if args.command == "promptpack":
        if args.pack_id != "serious-client-tone":
            raise SystemExit(f"Unsupported prompt pack: {args.pack_id}")
        input_paths: List[Path] = [Path(path) for path in args.input]
        report, metrics, profile = run_fixtures(input_paths)
        out_dir = Path(args.out_dir)
        out_dir.mkdir(parents=True, exist_ok=True)
        write_bundle(out_dir / "report.json", report)
        write_bundle(out_dir / "metrics.json", metrics)
        write_bundle(out_dir / "profile.json", profile)
        return 0

    return 1


if __name__ == "__main__":
    raise SystemExit(main())
