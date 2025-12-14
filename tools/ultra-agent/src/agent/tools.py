from __future__ import annotations
import pathlib
import subprocess
import os
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
    # Assume we are in the root of the generated project or passed in context
    # For now, just run pytest in current directory
    try:
        result = subprocess.run(["pytest"], capture_output=True, text=True)
        print(result.stdout)
        print(result.stderr)
        return result.returncode == 0
    except FileNotFoundError:
        print("[tools] pytest not found.")
        return False


def run_formatter() -> None:
    print("[tools] (stub) Formatter would run here.")


def run_linter() -> bool:
    print("[tools] (stub) Linter would run here.")
    return True

# GitHub Integration Stubs - requires PyGithub
try:
    from github import Github
    HAS_GITHUB = True
except ImportError:
    HAS_GITHUB = False

def get_github_client():
    token = os.environ.get("GITHUB_TOKEN")
    if not token:
        return None
    return Github(token)

def create_pr(branch: str, title: str, body: str, meta: dict[str, Any] | None = None) -> None:
    if not HAS_GITHUB:
        print(f"[tools] (stub - no PyGithub) Would create PR on branch '{branch}' with title '{title}'.")
        return

    client = get_github_client()
    if not client:
        print(f"[tools] (stub - no token) Would create PR on branch '{branch}' with title '{title}'.")
        return

    # This assumes we know the repo we are working on.
    # For a general tool, we'd need repo context.
    # We'll stick to stub logging for safety unless configured explicitly.
    print(f"[tools] (stub - safe mode) Would create PR on branch '{branch}' with title '{title}'.")


def merge_pr() -> None:
    print("[tools] (stub) Would merge PR now.")
