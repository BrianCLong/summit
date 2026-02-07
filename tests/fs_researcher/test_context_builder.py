import pytest
from pathlib import Path
from summit.agents.fs_researcher.workspace import init_workspace
from summit.agents.fs_researcher.context_builder import ContextBuilder

def test_context_builder_init(tmp_path):
    ws_root = tmp_path / "research_ws"
    paths = init_workspace(ws_root)
    cb = ContextBuilder(paths)

    cb.initialize_control_files("AI Safety")

    assert (ws_root / "index.md").exists()
    assert "AI Safety" in (ws_root / "index.md").read_text()
    assert (ws_root / "todo.md").exists()
    assert (ws_root / "log.md").exists()

def test_archive_source(tmp_path):
    ws_root = tmp_path / "research_ws"
    paths = init_workspace(ws_root)
    cb = ContextBuilder(paths)

    cb.archive_source("EVD-001", "Some raw HTML", "https://example-test.com")

    source_file = paths.sources_dir / "EVD-001.html"
    assert source_file.exists()
    assert "https://example-test.com" in source_file.read_text()
    assert "Some raw HTML" in source_file.read_text()

def test_add_kb_note(tmp_path):
    ws_root = tmp_path / "research_ws"
    paths = init_workspace(ws_root)
    cb = ContextBuilder(paths)

    cb.add_kb_note("Neural Networks", "Explanation of NN", ["EVD-001"])

    note_file = paths.kb_dir / "neural_networks.md"
    assert note_file.exists()
    assert "[[EVD-001]]" in note_file.read_text()

def test_update_todo(tmp_path):
    ws_root = tmp_path / "research_ws"
    paths = init_workspace(ws_root)
    cb = ContextBuilder(paths)
    cb.initialize_control_files("Test")

    cb.update_todo(["Initial search"], ["New Task"])

    todo_content = (ws_root / "todo.md").read_text()
    assert "[x] Initial search" in todo_content
    assert "- [ ] New Task" in todo_content
