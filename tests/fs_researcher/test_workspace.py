import pytest
from pathlib import Path
import json
from summit.agents.fs_researcher.workspace import init_workspace, write_deterministic_json, compute_stamp

def test_init_workspace(tmp_path):
    ws_root = tmp_path / "research_ws"
    paths = init_workspace(ws_root)

    assert ws_root.exists()
    assert paths.kb_dir.exists()
    assert paths.sources_dir.exists()
    assert paths.artifacts_dir.exists()

    assert (ws_root / "index.md").exists()
    assert (ws_root / "todo.md").exists()
    assert (ws_root / "log.md").exists()

def test_write_deterministic_json(tmp_path):
    out_path = tmp_path / "test.json"
    data = {"b": 2, "a": 1}
    write_deterministic_json(out_path, data)

    content = out_path.read_text()
    assert content == '{"a":1,"b":2}'

def test_compute_stamp(tmp_path):
    ws_root = tmp_path / "research_ws"
    paths = init_workspace(ws_root)

    # Add some content
    (paths.kb_dir / "note1.md").write_text("Note 1 content")
    (paths.sources_dir / "page1.html").write_text("Page 1 content")

    stamp1 = compute_stamp(paths)

    # Add a temporal file that should be ignored
    (paths.artifacts_dir / "run_meta.json").write_text('{"timestamp": "2024-01-01"}')
    stamp2 = compute_stamp(paths)

    assert stamp1 == stamp2

    # Add a real content change
    (paths.kb_dir / "note2.md").write_text("Note 2 content")
    stamp3 = compute_stamp(paths)

    assert stamp1 != stamp3
