import hashlib
import os
import time
from typing import Any

from .base import Config, Result, Scout


def hash_file(filepath: str) -> str:
    """Compute the SHA256 hash of a file."""
    hasher = hashlib.sha256()
    try:
        with open(filepath, 'rb') as f:
            for chunk in iter(lambda: f.read(4096), b""):
                hasher.update(chunk)
        return hasher.hexdigest()
    except Exception:
        # If we can't read the file (permissions, etc), return a zero hash or handle it
        return "0" * 64


def deterministic_tree_walk(root_dir: str, max_cost_ms: int) -> list[str]:
    """
    Finds files in a deterministic order and computes their hashes.
    Respects the time limit.
    """
    start_time = time.perf_counter()
    artifacts = []

    for root, dirs, files in os.walk(root_dir):
        # Deterministic order
        dirs.sort()
        files.sort()

        # Exclude hidden directories and node_modules for consistency with other scouts
        dirs[:] = [d for d in dirs if not d.startswith('.') and d != 'node_modules' and d != '__pycache__']

        for file in files:
            # Check time limit
            if (time.perf_counter() - start_time) * 1000 > max_cost_ms:
                return artifacts

            # Ignore hidden files or whatever
            if not file.startswith('.'):
                full_path = os.path.join(root, file)
                file_hash = hash_file(full_path)
                rel_path = os.path.relpath(full_path, root_dir)

                # Format: "hash  filepath"
                artifacts.append(f"{file_hash}  {rel_path}")

    return artifacts


class RepoMapScout(Scout):
    def name(self) -> str:
        return "repo_map"

    def _run(self, ctx: Any, cfg: Config) -> Result:
        root_dir = "."
        if hasattr(ctx, "path"):
            root_dir = ctx.path
        elif isinstance(ctx, dict) and "path" in ctx:
            root_dir = ctx["path"]

        if not os.path.exists(root_dir):
            root_dir = "."

        start_time = time.perf_counter()
        artifacts = deterministic_tree_walk(root_dir, cfg.max_cost_ms)
        cost_ms = int((time.perf_counter() - start_time) * 1000)

        return Result(artifacts=artifacts, cost_ms=cost_ms)
