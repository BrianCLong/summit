from connectors.notebooklm.cli import build_add_source, build_create_notebook


def test_create_notebook_args():
    cmd = build_create_notebook("Hello")
    assert cmd.argv[:2] == ["notebooklm", "create"]
    assert "--json" in cmd.argv


def test_add_source_args():
    cmd = build_add_source("nb123", "/tmp/a.md")
    assert cmd.argv[:3] == ["notebooklm", "source", "add"]
    assert "nb123" in cmd.argv
