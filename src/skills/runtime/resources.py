from __future__ import annotations

from pathlib import Path


class ResourceError(RuntimeError):
    pass

def safe_read(skill_root: Path, rel_path: str, max_bytes: int = 256_000) -> str:
    p = (skill_root / rel_path).resolve()
    root = skill_root.resolve()
    if not str(p).startswith(str(root) + "/"):
        raise ResourceError("path traversal denied")
    data = p.read_bytes()
    if len(data) > max_bytes:
        raise ResourceError("resource too large")
    return data.decode("utf-8", errors="replace")
