from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

from .security import detect_prompt_injection, redact_pii
from .workspace import build_evidence_id, write_deterministic_json


@dataclass(frozen=True)
class SourceDocument:
    source_id: str
    title: str
    content: str
    extension: str = ".md"


@dataclass(frozen=True)
class ContextBuildResult:
    kb_files: list[Path]
    source_files: list[Path]
    warnings: list[str]


def build_context(
    workspace_root: Path,
    sources: Iterable[SourceDocument],
    query: str,
) -> ContextBuildResult:
    warnings: list[str] = []
    kb_dir = workspace_root / "knowledge_base"
    sources_dir = workspace_root / "sources"
    kb_dir.mkdir(parents=True, exist_ok=True)
    sources_dir.mkdir(parents=True, exist_ok=True)

    source_files: list[Path] = []
    kb_lines: list[str] = ["# Knowledge Base", ""]

    resolved_sources = list(sources)
    if not resolved_sources:
        resolved_sources = [
            SourceDocument(
                source_id="query-seed",
                title="Query Seed",
                content=f"Query: {query}",
            )
        ]

    for idx, source in enumerate(resolved_sources, start=1):
        safe_name = _sanitize_filename(source.source_id)
        filename = f"{safe_name}{source.extension}"
        source_path = sources_dir / filename
        source_path.write_text(source.content, encoding="utf-8")
        source_files.append(source_path)

        summary = _truncate(f"Source {idx}: {source.title}", max_chars=160)
        summary, pii_findings = redact_pii(summary)
        warnings.extend([f"{source.source_id}: {f.message}" for f in pii_findings])
        if summary.endswith("…"):
            warnings.append(f"{source.source_id}: summary truncated")

        evidence_id = build_evidence_id(filename, 1)
        kb_lines.append(
            f"- {summary} (Evidence: {evidence_id}; Source: sources/{filename})"
        )

        injection_findings = detect_prompt_injection(source.content.splitlines())
        warnings.extend([f"{source.source_id}: {f.message}" for f in injection_findings])

    kb_path = kb_dir / "kb.md"
    kb_path.write_text("\n".join(kb_lines) + "\n", encoding="utf-8")

    if warnings:
        warning_path = workspace_root / "artifacts" / "kb_warnings.json"
        warning_path.parent.mkdir(parents=True, exist_ok=True)
        write_deterministic_json(
            warning_path,
            {"warnings": warnings},
        )

    _append_log(workspace_root / "log.md", f"Context built for query: {query}")
    _append_line(workspace_root / "index.md", f"- Query: {query}")
    _append_line(
        workspace_root / "todo.md",
        "- [x] Collect sources and build knowledge base",
    )

    return ContextBuildResult(
        kb_files=[kb_path],
        source_files=source_files,
        warnings=warnings,
    )


def _sanitize_filename(text: str) -> str:
    return "".join(ch for ch in text.lower().replace(" ", "-") if ch.isalnum() or ch == "-")


def _append_log(path: Path, entry: str) -> None:
    with path.open("a", encoding="utf-8") as handle:
        handle.write(f"- {entry}\n")


def _append_line(path: Path, entry: str) -> None:
    with path.open("a", encoding="utf-8") as handle:
        handle.write(f"{entry}\n")


def _truncate(text: str, max_chars: int) -> str:
    if len(text) <= max_chars:
        return text
    return text[: max_chars - 1] + "…"
