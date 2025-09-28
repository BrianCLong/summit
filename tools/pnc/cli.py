"""Convenience CLI entry points for the PNC toolkit."""
from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Iterable, Optional

from . import attest, report, verify


def build_main_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Proof-of-Non-Collection toolkit")
    sub = parser.add_subparsers(dest="command", required=True)

    attest.configure_parser(sub.add_parser("attest", help="Generate PNC attestation bundle"))
    verify.configure_parser(sub.add_parser("verify", help="Verify a PNC attestation bundle"))
    report.configure_parser(sub.add_parser("report", help="Aggregate attestations into monthly reports"))

    return parser


def main(argv: Optional[Iterable[str]] = None):
    parser = build_main_parser()
    args = parser.parse_args(argv)
    if args.command == "attest":
        return attest.generate_attestation(
            trace_path=Path(args.trace),
            allowlist_path=Path(args.allowlist),
            denylist_path=Path(args.denylist),
            output_path=Path(args.output),
            signing_key=args.signing_key,
            key_id=args.key_id,
        )
    if args.command == "verify":
        return verify.verify_bundle(
            bundle_path=Path(args.bundle),
            allowlist_path=Path(args.allowlist),
            denylist_path=Path(args.denylist),
            signing_key=args.signing_key,
        )
    if args.command == "report":
        bundles: list[Path] = []
        for item in args.bundles:
            path = Path(item)
            if path.is_dir():
                bundles.extend(sorted(path.glob("*.json")))
            else:
                bundles.append(path)
        report_data = report.aggregate_reports(bundles)
        Path(args.output).write_text(json.dumps(report_data, indent=2, sort_keys=True))
        return report_data
    raise SystemExit(f"Unsupported command {args.command}")


if __name__ == "__main__":
    main()
