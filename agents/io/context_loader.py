from __future__ import annotations

from pathlib import Path

from agents.io.hash import sha256_hex


def load_context(path: Path) -> dict[str, str | int]:
    content = path.read_bytes()
    return {
        "path": str(path),
        "size": len(content),
        "sha256": sha256_hex(content),
    }
