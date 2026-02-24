from __future__ import annotations
from dataclasses import dataclass
from pathlib import Path
import json
import hashlib
from typing import Dict, Any

EVIDENCE_ID_PREFIX = "EVID"

@dataclass(frozen=True)
class WorkspacePaths:
    root: Path
    control_dir: Path
    kb_dir: Path
    sources_dir: Path
    artifacts_dir: Path

def init_workspace(root: Path) -> WorkspacePaths:
    """
    Initializes the FS-Researcher workspace directory structure.
    """
    root.mkdir(parents=True, exist_ok=True)
    paths = WorkspacePaths(
        root=root,
        control_dir=root,
        kb_dir=root / "knowledge_base",
        sources_dir=root / "sources",
        artifacts_dir=root / "artifacts",
    )
    for p in (paths.kb_dir, paths.sources_dir, paths.artifacts_dir):
        p.mkdir(parents=True, exist_ok=True)

    _write_if_missing(root / "index.md", "# Research Index\n")
    _write_if_missing(root / "todo.md", "# Research Todo\n")
    _write_if_missing(root / "log.md", "# Research Log\n")

    return paths

def write_deterministic_json(path: Path, obj: Any) -> None:
    """
    Writes a JSON file with sorted keys and no extra whitespace for determinism.
    """
    data = json.dumps(obj, sort_keys=True, separators=(",", ":"), ensure_ascii=False)
    path.write_text(data, encoding="utf-8")

def compute_stamp(paths: WorkspacePaths) -> Dict[str, Any]:
    """
    Computes a deterministic hash of the workspace contents, excluding temporal metadata.
    """
    h = hashlib.sha256()
    # Iterate over all files in root, kb, and sources. Exclude artifacts/stamp.json and run_meta.json
    all_files = sorted(paths.root.rglob("*"))
    for fp in all_files:
        if fp.is_dir():
            continue

        # Always exclude these
        if fp.name in ["stamp.json", "run_meta.json"]:
            continue

        # If in artifacts dir, only include report.json and metrics.json
        if paths.artifacts_dir in fp.parents:
             if fp.name not in ["report.json", "metrics.json"]:
                 continue

        h.update(str(fp.relative_to(paths.root)).encode("utf-8"))
        h.update(b"\n")
        h.update(fp.read_bytes())
        h.update(b"\n")

    return {
        "schema": "fs-researcher.v1",
        "sha256": h.hexdigest()
    }

def _write_if_missing(path: Path, content: str) -> None:
    if not path.exists():
        path.write_text(content, encoding="utf-8")
