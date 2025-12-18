from pathlib import Path

import pytest

from tools.agent_audit import AgentFinding, AgentScanner, render_markdown


@pytest.fixture
def fixture_root(tmp_path: Path) -> Path:
    fixtures = Path(__file__).parent / "data" / "agent_audit"
    target = tmp_path / "fixtures"
    target.mkdir()
    for file_path in fixtures.iterdir():
        target_file = target / file_path.name
        target_file.write_text(file_path.read_text(), encoding="utf-8")
    return target


def test_scanner_detects_agents(fixture_root: Path) -> None:
    scanner = AgentScanner(fixture_root)
    findings = scanner.scan()

    assert len(findings) == 2
    names = {finding.name for finding in findings}
    assert "PR Agent" in names
    assert "intelgraph-curator" in names

    workflow = next(f for f in findings if f.name == "PR Agent")
    assert "pull_request" in workflow.triggers
    assert workflow.interface == "pr-bot"
    assert workflow.risk_score >= 1
    assert any("static" in note for note in workflow.notes)


def test_markdown_summary_includes_totals(fixture_root: Path) -> None:
    scanner = AgentScanner(fixture_root)
    findings = scanner.scan()
    markdown = render_markdown(findings)

    assert "# Agent Inventory Summary" in markdown
    assert f"Total agents: {len(findings)}" in markdown
    for finding in findings:
        assert finding.name in markdown
