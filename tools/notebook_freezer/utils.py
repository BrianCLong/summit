"""Utility helpers for the Reproducible Notebook Freezer."""

from __future__ import annotations

import contextlib
import datetime as _dt
import hashlib
import json
import os
from pathlib import Path
from typing import Any, Dict, Iterable, Iterator, List, Tuple

ISO_FORMAT = "%Y-%m-%dT%H:%M:%S.%fZ"


def utcnow() -> str:
    """Return a UTC timestamp in ISO format with millisecond precision."""
    now = _dt.datetime.now(tz=_dt.timezone.utc)
    return now.replace(microsecond=(now.microsecond // 1000) * 1000).strftime(ISO_FORMAT)


def sha256_bytes(data: bytes) -> str:
    """Return the hex digest for the given bytes."""
    return hashlib.sha256(data).hexdigest()


def sha256_file(path: Path) -> str:
    """Return the sha256 digest for a file."""
    h = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def dumps_json(data: Any) -> str:
    """Serialise JSON using deterministic ordering and UTF-8 encoding."""
    return json.dumps(data, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def write_json(path: Path, data: Any) -> None:
    """Write JSON to a file using deterministic formatting."""
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(dumps_json(data) + "\n", encoding="utf-8")


def read_json(path: Path) -> Any:
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def ensure_clean_dir(path: Path) -> None:
    """Ensure a directory exists and is empty."""
    if path.exists():
        if any(path.iterdir()):
            raise FileExistsError(f"Bundle target {path} is not empty")
    else:
        path.mkdir(parents=True, exist_ok=False)


def normalize_text(value: Any) -> str:
    if isinstance(value, list):
        return "".join(value)
    if value is None:
        return ""
    return str(value)


def normalise_output(output: Dict[str, Any]) -> Dict[str, Any]:
    """Simplify notebook output cells into a deterministic JSON shape."""
    otype = output.get("output_type")
    if otype == "stream":
        return {
            "type": "stream",
            "name": output.get("name", "stdout"),
            "text": normalize_text(output.get("text", "")),
        }
    if otype in {"execute_result", "display_data"}:
        data = output.get("data", {})
        cleaned: Dict[str, Any] = {}
        for key in sorted(data):
            value = data[key]
            if isinstance(value, list):
                cleaned[key] = "".join(str(item) for item in value)
            else:
                cleaned[key] = value
        return {
            "type": otype,
            "data": cleaned,
        }
    if otype == "error":
        return {
            "type": "error",
            "ename": output.get("ename"),
            "evalue": output.get("evalue"),
            "traceback": output.get("traceback", []),
        }
    # Fallback to a deterministic representation.
    return {
        "type": otype or "unknown",
        "raw": output,
    }


def notebook_cells(notebook: Dict[str, Any]) -> Iterator[Tuple[int, Dict[str, Any]]]:
    for index, cell in enumerate(notebook.get("cells", [])):
        yield index, cell


@contextlib.contextmanager
def change_cwd(path: Path) -> Iterator[None]:
    """Context manager that temporarily changes the working directory."""
    prev = Path.cwd()
    os.chdir(path)
    try:
        yield
    finally:
        os.chdir(prev)


def flatten_paths(paths: Iterable[Path]) -> List[Path]:
    files: List[Path] = []
    for path in paths:
        if path.is_dir():
            for sub in sorted(path.rglob("*")):
                if sub.is_file():
                    files.append(sub)
        elif path.is_file():
            files.append(path)
    return files


def relative_to(paths: Iterable[Path], root: Path) -> List[Path]:
    result: List[Path] = []
    for path in paths:
        try:
            result.append(path.relative_to(root))
        except ValueError:
            result.append(Path("..") / path.resolve())
    return result
