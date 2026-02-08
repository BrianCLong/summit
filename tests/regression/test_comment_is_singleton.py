from pathlib import Path


def test_comment_is_singleton_marker() -> None:
    workflow_path = Path(".github/workflows/pr_comment_evidence.yml")
    content = workflow_path.read_text(encoding="utf-8")
    assert "<!-- evidence-badge -->" in content
    assert "actions/github-script" in content
    assert "listComments" in content
    assert "updateComment" in content
