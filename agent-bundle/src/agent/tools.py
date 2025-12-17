from __future__ import annotations
import pathlib
import subprocess
from typing import Any


def write_file(path: str, content: str) -> None:
    p = pathlib.Path(path)
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(content, encoding="utf-8")


def read_file(path: str) -> str:
    return pathlib.Path(path).read_text(encoding="utf-8")


def run_tests() -> bool:
    """Run pytest and return True if passing."""
    print("[tools] Running tests...")
    result = subprocess.run(["pytest"], capture_output=True, text=True)
    print(result.stdout)
    print(result.stderr)
    return result.returncode == 0


def run_formatter() -> None:
    print("[tools] (stub) Formatter would run here.")


def run_linter() -> bool:
    print("[tools] (stub) Linter would run here.")
    return True


def create_pr(branch: str, title: str, body: str, meta: dict[str, Any] | None = None) -> None:
    print(f"[tools] (stub) Would create PR on branch '{branch}' with title '{title}'.")


def merge_pr() -> None:
    print("[tools] (stub) Would merge PR now.")
