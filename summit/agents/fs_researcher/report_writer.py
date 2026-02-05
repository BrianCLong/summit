from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

from .workspace import compute_stamp, count_facts, write_deterministic_json


@dataclass
class ReportWriterConfig:
    tools_allowed: bool = False
    max_section_iters: int = 50


def assert_no_browsing_tools(tools_allowed: bool) -> None:
    if tools_allowed:
        raise RuntimeError("ReportWriter must run kb-only with browsing tools disabled.")


def write_report(workspace_root: Path, config: ReportWriterConfig) -> dict:
    assert_no_browsing_tools(config.tools_allowed)

    kb_dir = workspace_root / "knowledge_base"
    artifacts_dir = workspace_root / "artifacts"
    artifacts_dir.mkdir(parents=True, exist_ok=True)

    kb_files = sorted(kb_dir.glob("*.md"))
    outline_lines = ["# Report Outline", ""]
    report_lines = ["# Report", ""]
    sections: list[dict] = []

    total_facts = 0
    cited_facts = 0

    for kb_file in kb_files:
        section_title = kb_file.stem.replace("_", " ").title()
        outline_lines.append(f"- {section_title}")
        report_lines.append(f"## {section_title}")

        lines = kb_file.read_text(encoding="utf-8").splitlines()
        facts, cited = count_facts(lines)
        total_facts += facts
        cited_facts += cited

        for line in lines:
            if line.strip().startswith("-"):
                report_lines.append(line)
        report_lines.append("")

        sections.append(
            {
                "title": section_title,
                "status": "complete",
                "facts": facts,
                "cited_facts": cited,
                "checklist": {
                    "citations_present": cited == facts if facts else True,
                    "kb_only": True,
                },
            }
        )

    (workspace_root / "report_outline.md").write_text(
        "\n".join(outline_lines) + "\n", encoding="utf-8"
    )
    (workspace_root / "report.md").write_text(
        "\n".join(report_lines) + "\n", encoding="utf-8"
    )

    metrics = {
        "kb_files": len(kb_files),
        "facts_total": total_facts,
        "facts_cited": cited_facts,
        "citation_coverage": (cited_facts / total_facts) if total_facts else 0.0,
    }
    report = {
        "kb_only": True,
        "sections": sections,
        "report_checklist": {
            "kb_only": True,
            "all_sections_complete": all(section["status"] == "complete" for section in sections),
        },
    }

    write_deterministic_json(artifacts_dir / "metrics.json", metrics)
    write_deterministic_json(artifacts_dir / "report.json", report)
    write_deterministic_json(artifacts_dir / "stamp.json", compute_stamp(_paths(workspace_root)))

    return {"metrics": metrics, "report": report}


def _paths(root: Path):
    from .workspace import WorkspacePaths

    return WorkspacePaths(
        root=root,
        control_dir=root,
        kb_dir=root / "knowledge_base",
        sources_dir=root / "sources",
        artifacts_dir=root / "artifacts",
    )
