import pytest
from pathlib import Path
from summit.agents.fs_researcher.workspace import init_workspace
from summit.agents.fs_researcher.report_writer import ReportWriter

def test_report_writer_no_tools(tmp_path):
    ws_root = tmp_path / "research_ws"
    paths = init_workspace(ws_root)

    # Should fail if tools_allowed is True
    with pytest.raises(RuntimeError, match="browsing tools disabled"):
        ReportWriter(paths, tools_allowed=True)

    # Should pass if tools_allowed is False
    rw = ReportWriter(paths, tools_allowed=False)
    assert rw.tools_allowed is False

def test_generate_outline(tmp_path):
    ws_root = tmp_path / "research_ws"
    paths = init_workspace(ws_root)
    rw = ReportWriter(paths)

    outline = rw.generate_outline("Some KB content")
    assert "Introduction" in outline
    assert (ws_root / "report_outline.md").exists()

def test_write_section(tmp_path):
    ws_root = tmp_path / "research_ws"
    paths = init_workspace(ws_root)
    rw = ReportWriter(paths)

    section_content = rw.write_section("Intro", "KB Data", ["Citations present", "No PII"])
    assert "## Intro" in section_content
    assert (ws_root / "report.md").exists()
    assert "## Intro" in (ws_root / "report.md").read_text()

from unittest.mock import patch

def test_write_section_failure(tmp_path):
    ws_root = tmp_path / "research_ws"
    paths = init_workspace(ws_root)
    rw = ReportWriter(paths)

    with patch.object(ReportWriter, '_validate_checklist', side_effect=ValueError("failed checklist")):
        with pytest.raises(ValueError, match="failed checklist"):
            rw.write_section("Intro", "KB Data", ["Must fail this"])
