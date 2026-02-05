from __future__ import annotations

import argparse
import json
import time
from pathlib import Path

from summit.agents.fs_researcher.report_writer import ReportWriterConfig, write_report


def main() -> int:
    parser = argparse.ArgumentParser(description="Profile FS-Researcher report stage")
    parser.add_argument("--workspace", required=True)
    parser.add_argument("--out", required=True)
    args = parser.parse_args()

    start = time.perf_counter()
    write_report(Path(args.workspace), ReportWriterConfig())
    duration = time.perf_counter() - start

    profile = {
        "duration_seconds": round(duration, 6),
        "workspace": args.workspace,
    }
    Path(args.out).write_text(
        json.dumps(profile, sort_keys=True, separators=(",", ":")),
        encoding="utf-8",
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
