from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
import hashlib
import json
import re
from typing import Iterable

from .security import detect_prompt_injection

EVIDENCE_ID_PREFIX = "EVID"
SOURCE_REF_PATTERN = re.compile(r"sources/[^\s)]+")
EVIDENCE_ID_PATTERN = re.compile(r"\bEVID-[A-F0-9]{8}\b")


@dataclass(frozen=True)
class WorkspacePaths:
    root: Path
    control_dir: Path
    kb_dir: Path
    sources_dir: Path
    artifacts_dir: Path


def init_workspace(root: Path) -> WorkspacePaths:
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
    _write_if_missing(root / "index.md", "# index\n")
    _write_if_missing(root / "todo.md", "# todo\n")
    _write_if_missing(root / "log.md", "# log\n")
    return paths


def write_deterministic_json(path: Path, obj: dict) -> None:
    data = json.dumps(obj, sort_keys=True, separators=(",", ":"), ensure_ascii=False)
    path.write_text(data, encoding="utf-8")


def compute_stamp(paths: WorkspacePaths) -> dict:
    h = hashlib.sha256()
    for fp in sorted(paths.root.rglob("*")):
        if fp.is_dir():
            continue
        if fp.name == "run_meta.json":
            continue
        h.update(str(fp.relative_to(paths.root)).encode("utf-8"))
        h.update(b"\n")
        h.update(fp.read_bytes())
        h.update(b"\n")
    return {"schema": "fs-researcher.v1", "sha256": h.hexdigest()}


def build_evidence_id(source_name: str, line_no: int) -> str:
    digest = hashlib.sha256(f"{source_name}:{line_no}".encode("utf-8")).hexdigest()
    return f"{EVIDENCE_ID_PREFIX}-{digest[:8].upper()}"


def validate_kb_line(line: str) -> list[str]:
    errors: list[str] = []
    if line.strip().startswith("-"):
        if not EVIDENCE_ID_PATTERN.search(line):
            errors.append("missing evidence id")
        if not SOURCE_REF_PATTERN.search(line):
            errors.append("missing source reference")
    return errors


def validate_workspace(paths: WorkspacePaths) -> list[str]:
    errors: list[str] = []
    for kb_file in sorted(paths.kb_dir.glob("*.md")):
        for idx, line in enumerate(kb_file.read_text(encoding="utf-8").splitlines(), start=1):
            line_errors = validate_kb_line(line)
            if line_errors:
                errors.append(
                    f"{kb_file.relative_to(paths.root)}:{idx}: "
                    + ", ".join(line_errors)
                )
            if line.strip().startswith("-") and detect_prompt_injection([line]):
                errors.append(
                    f"{kb_file.relative_to(paths.root)}:{idx}: "
                    "instruction-like text must be quoted"
                )
    for kb_file in sorted(paths.kb_dir.glob("*.md")):
        for line in kb_file.read_text(encoding="utf-8").splitlines():
            match = SOURCE_REF_PATTERN.search(line)
            if match:
                source_path = paths.root / match.group(0)
                if not source_path.exists():
                    errors.append(
                        f"{kb_file.relative_to(paths.root)} references missing {match.group(0)}"
                    )
    return errors


def count_facts(lines: Iterable[str]) -> tuple[int, int]:
    total = 0
    cited = 0
    for line in lines:
        if line.strip().startswith("-"):
            total += 1
            if EVIDENCE_ID_PATTERN.search(line) and SOURCE_REF_PATTERN.search(line):
                cited += 1
    return total, cited


def _write_if_missing(path: Path, content: str) -> None:
    if not path.exists():
        path.write_text(content, encoding="utf-8")
