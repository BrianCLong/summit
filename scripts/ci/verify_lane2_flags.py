#!/usr/bin/env python3
from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
FLAGS_PATH = ROOT / "feature-flags" / "flags.yaml"
ENV_CANDIDATES = [ROOT / ".env", ROOT / ".env.example"]

LANE2_ENV_KEYS = {
    "SUMMIT_MM_GDCNET",
    "SUMMIT_MM_LANE2",
    "SUMMIT_MM_ENSEMBLES",
    "SUMMIT_MM_ROBUSTNESS",
}


def fail(message: str) -> None:
    print(f"lane2-check: FAIL: {message}", file=sys.stderr)
    raise SystemExit(1)


def _parse_lane2_defaults(text: str) -> dict[str, str | None]:
    lane2_defaults: dict[str, str | None] = {}
    current_key: str | None = None
    current_indent = 0

    for line in text.splitlines():
        if not line.strip() or line.lstrip().startswith("#"):
            continue
        indent = len(line) - len(line.lstrip(" "))
        stripped = line.strip()

        if indent == 2 and ":" in stripped:
            key = stripped.split(":", 1)[0].strip()
            current_key = key if "lane2" in key.lower() else None
            current_indent = indent
            if current_key:
                lane2_defaults.setdefault(current_key, None)
                match = re.search(r"default:\s*([A-Za-z0-9_-]+)", stripped)
                if match:
                    lane2_defaults[current_key] = match.group(1)
            continue

        if current_key and indent > current_indent:
            match = re.search(r"default:\s*([A-Za-z0-9_-]+)", stripped)
            if match:
                lane2_defaults[current_key] = match.group(1)
            continue

        if indent <= current_indent:
            current_key = None

    return lane2_defaults


def verify_lane2_flags() -> None:
    if not FLAGS_PATH.exists():
        fail(f"Missing feature flag registry: {FLAGS_PATH}")
    text = FLAGS_PATH.read_text(encoding="utf-8")
    lane2_defaults = _parse_lane2_defaults(text)
    if not lane2_defaults:
        fail("No lane2 flags found in feature-flags/flags.yaml")
    for name, default in lane2_defaults.items():
        if default is None:
            fail(f"Lane2 flag missing default: {name}")
        if default.lower() in {"true", "1", "yes", "on"}:
            fail(f"Lane2 flag must default to false: {name}={default}")


def _check_env_file(path: Path) -> None:
    if not path.exists():
        return
    for line in path.read_text(encoding="utf-8").splitlines():
        if not line.strip() or line.lstrip().startswith("#"):
            continue
        for key in LANE2_ENV_KEYS:
            if not line.startswith(f"{key}="):
                continue
            value = line.split("=", 1)[1].strip().strip('"').strip("'")
            if value.lower() in {"true", "1", "yes", "on"}:
                fail(f"Lane2 env var must remain off in {path}: {key}={value}")


def main() -> int:
    verify_lane2_flags()
    for path in ENV_CANDIDATES:
        _check_env_file(path)
    print("lane2-check: PASS")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
