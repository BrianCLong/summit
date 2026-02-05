from __future__ import annotations

import argparse
import sys
from pathlib import Path

from summit.agents.fs_researcher.config import FSResearcherConfig
from summit.agents.fs_researcher.context_builder import SourceDocument, build_context
from summit.agents.fs_researcher.report_writer import ReportWriterConfig, write_report
from summit.agents.fs_researcher.workspace import init_workspace, validate_workspace


def _load_fixtures(fixtures_dir: Path, limit: int) -> list[SourceDocument]:
    sources: list[SourceDocument] = []
    for path in sorted(fixtures_dir.iterdir()):
        if path.is_dir():
            continue
        if path.suffix.lower() not in {".md", ".html", ".txt"}:
            continue
        sources.append(
            SourceDocument(
                source_id=path.stem,
                title=path.stem.replace("_", " ").title(),
                content=path.read_text(encoding="utf-8"),
                extension=path.suffix,
            )
        )
        if len(sources) >= limit:
            break
    return sources


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(prog="summit fs-research")
    p.add_argument("--query", required=True)
    p.add_argument("--workspace", required=True)
    p.add_argument("--fixtures", help="Optional directory of offline sources")
    return p


def main(argv: list[str] | None = None) -> int:
    config = FSResearcherConfig.from_env()
    if not config.enabled:
        print(
            "FS-Researcher is disabled. Set FS_RESEARCHER_ENABLED=1 to enable.",
            file=sys.stderr,
        )
        return 1

    parser = build_parser()
    args = parser.parse_args(argv)

    workspace_root = Path(args.workspace)
    paths = init_workspace(workspace_root)

    sources: list[SourceDocument] = []
    if args.fixtures:
        sources = _load_fixtures(Path(args.fixtures), config.max_sources)

    build_context(workspace_root, sources=sources, query=args.query)

    errors = validate_workspace(paths)
    if errors:
        print("Workspace validation failed:", file=sys.stderr)
        for err in errors:
            print(f"- {err}", file=sys.stderr)
        return 1

    write_report(workspace_root, ReportWriterConfig())
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
