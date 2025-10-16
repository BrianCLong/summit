"""Command line interface for SCPE."""

from __future__ import annotations

import argparse
import sys
from collections.abc import Sequence
from pathlib import Path

from .errors import ReceiptError, SCPEError
from .receipt import build_receipt, verify_receipt, write_receipt
from .validator import Validator


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Supply-Chain Provenance Enforcer")
    subparsers = parser.add_subparsers(dest="command", required=True)

    verify_parser = subparsers.add_parser("verify", help="Validate artifacts, SBOM, and provenance")
    verify_parser.add_argument(
        "--config", required=True, help="Path to the SCPE configuration file"
    )
    verify_parser.add_argument(
        "--receipt",
        help="Optional path to write the deterministic attested receipt",
    )

    receipt_parser = subparsers.add_parser(
        "receipt-verify", help="Verify the integrity of a SCPE receipt"
    )
    receipt_parser.add_argument("--receipt", required=True, help="Path to the receipt JSON file")

    return parser


def main(argv: Sequence[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)

    try:
        if args.command == "verify":
            return _run_verify(Path(args.config), args.receipt)
        if args.command == "receipt-verify":
            return _run_receipt_verify(Path(args.receipt))
    except SCPEError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 1
    except Exception as exc:  # pragma: no cover - final safety net
        print(f"unexpected error: {exc}", file=sys.stderr)
        return 1

    parser.print_help()
    return 1


def _run_verify(config_path: Path, receipt: str | None) -> int:
    validator = Validator(config_path)
    verification = validator.run()

    if receipt:
        receipt_path = Path(receipt)
        receipt_document = build_receipt(
            config_path=config_path,
            config=validator.config,
            verification=verification,
        )
        write_receipt(receipt_document, receipt_path)

    return 0


def _run_receipt_verify(receipt_path: Path) -> int:
    try:
        verify_receipt(receipt_path)
    except ReceiptError:
        raise
    return 0


if __name__ == "__main__":  # pragma: no cover
    sys.exit(main())
