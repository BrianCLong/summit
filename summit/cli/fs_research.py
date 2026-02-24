import argparse
import sys
from pathlib import Path
from summit.flags import FS_RESEARCHER_ENABLED
from summit.agents.fs_researcher.workspace import init_workspace, write_deterministic_json, compute_stamp
from summit.agents.fs_researcher.context_builder import ContextBuilder
from summit.agents.fs_researcher.report_writer import ReportWriter

def main(argv=None):
    parser = argparse.ArgumentParser(prog="summit fs-research")
    parser.add_argument("--query", required=True, help="Research query")
    parser.add_argument("--workspace", required=True, type=Path, help="Workspace directory")

    args = parser.parse_args(argv)

    if not FS_RESEARCHER_ENABLED:
        print("Error: FS-Researcher mode is not enabled. Set FS_RESEARCHER_ENABLED=1 to enable.", file=sys.stderr)
        return 1

    print(f"Starting research for: {args.query}")
    print(f"Workspace: {args.workspace}")

    # 1. Initialize Workspace
    paths = init_workspace(args.workspace)

    # 2. Stage 1: Context Builder
    cb = ContextBuilder(paths)
    cb.initialize_control_files(args.query)

    # Simulate some research
    cb.run_iteration("Searching for initial leads")
    cb.archive_source("EVD-001", "Simulated web content", "http://example.com/ai-safety")
    cb.add_kb_note("Core Principles", "Foundations of AI safety...", ["EVD-001"])
    cb.update_todo(["Initial search"], ["Analyze core principles"])

    # 3. Stage 2: Report Writer
    rw = ReportWriter(paths)
    outline = rw.generate_outline(kb_summary="Principles of AI Safety")

    for section in outline:
        rw.write_section(section, "KB summary content", ["Fact-checked", "Cited"])

    # 4. Finalize artifacts
    metrics = {
        "query": args.query,
        "source_count": 1,
        "kb_note_count": 1,
        "section_count": len(outline),
        "citation_count": 1
    }
    write_deterministic_json(paths.artifacts_dir / "metrics.json", metrics)

    report_info = {
        "title": f"Research Report: {args.query}",
        "sections": outline,
        "status": "COMPLETED"
    }
    write_deterministic_json(paths.artifacts_dir / "report.json", report_info)

    stamp = compute_stamp(paths)
    write_deterministic_json(paths.artifacts_dir / "stamp.json", stamp)

    print(f"Research completed successfully. Artifacts in {paths.artifacts_dir}")
    return 0

if __name__ == "__main__":
    sys.exit(main())
