"""CI runner generation for compiled GRTC corpora."""

from __future__ import annotations

import os
from pathlib import Path

CI_DIR_NAME = "ci"


def generate_ci_assets(output_dir: Path) -> None:
    ci_dir = output_dir / CI_DIR_NAME
    ci_dir.mkdir(parents=True, exist_ok=True)
    script_path = ci_dir / "run_reference_adapter.py"
    script_path.write_text(_reference_runner(), encoding="utf-8")
    os.chmod(script_path, 0o755)

    shim_path = ci_dir / "run_reference_adapter.sh"
    shim_path.write_text(_shell_runner(), encoding="utf-8")
    os.chmod(shim_path, 0o755)


def _reference_runner() -> str:
    return """#!/usr/bin/env python3
from __future__ import annotations

import json
from pathlib import Path
import sys

from tools.grtc.runtime import ReferenceAdapter, execute_corpus


def main() -> int:
    corpus_dir = Path(__file__).resolve().parents[1]
    results = execute_corpus(corpus_dir, ReferenceAdapter())
    summary = {
        "total": len(results),
        "passed": sum(1 for item in results if item.passed),
        "failed": [item.test_id for item in results if not item.passed],
    }
    print(json.dumps(summary, indent=2))
    return 0 if summary["failed"] == [] else 1


if __name__ == "__main__":
    sys.exit(main())
"""


def _shell_runner() -> str:
    return """#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
python3 "$SCRIPT_DIR/run_reference_adapter.py"
"""


__all__ = ["generate_ci_assets", "CI_DIR_NAME"]
