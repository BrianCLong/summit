"""Command line interface for SecretSentry."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from .report import render_markdown
from .scanner import scan_path


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="secretsentry", description="Secret scanner")
    subparsers = parser.add_subparsers(dest="command", required=True)

    scan_parser = subparsers.add_parser("scan", help="Scan a directory for secrets")
    scan_parser.add_argument(
        "--path",
        default=".",
        help="Root path to scan",
    )
    scan_parser.add_argument(
        "--allowlist",
        default=None,
        help="Optional allowlist file",
    )
    scan_parser.add_argument(
        "--json-report",
        default=None,
        help="Optional path to write the JSON report",
    )
    scan_parser.add_argument(
        "--markdown-report",
        default=None,
        help="Optional path to write the Markdown report",
    )
    scan_parser.add_argument(
        "--mode",
        choices=["warn", "block"],
        default="warn",
        help="Warn keeps exit code 0, block exits 1 on findings",
    )
    return parser


def main(argv: list[str] | None = None) -> int:
    parser = _build_parser()
    args = parser.parse_args(argv)

    if args.command == "scan":
        root_path = Path(args.path).expanduser()
        allowlist_arg = args.allowlist
        try:
            result = scan_path(root_path, allowlist_arg)
        except (FileNotFoundError, NotADirectoryError) as exc:
            print(str(exc), file=sys.stderr)
            return 2
        json_payload = result.to_json()
        markdown_payload = render_markdown(result)

        if args.json_report:
            json_path = Path(args.json_report).expanduser()
            json_path.parent.mkdir(parents=True, exist_ok=True)
            json_path.write_text(json_payload + "\n", encoding="utf-8")
        else:
            print(json_payload)

        if args.markdown_report:
            markdown_path = Path(args.markdown_report).expanduser()
            markdown_path.parent.mkdir(parents=True, exist_ok=True)
            markdown_path.write_text(markdown_payload + "\n", encoding="utf-8")
        else:
            print("\n" + markdown_payload)

        has_findings = len(result.findings) > 0
        if args.mode == "block" and has_findings:
            return 1
        return 0

    parser.print_help()
    return 1


if __name__ == "__main__":  # pragma: no cover
    sys.exit(main())
