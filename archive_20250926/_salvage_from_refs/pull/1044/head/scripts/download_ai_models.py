#!/usr/bin/env python3
"""Helper script to download AI models used by the Node services."""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path


def main() -> None:
    repo_root = Path(__file__).resolve().parents[1]
    downloader = repo_root / "python" / "ai_models" / "download_models.py"
    subprocess.check_call([sys.executable, str(downloader)])


if __name__ == "__main__":
    main()
