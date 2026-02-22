import pytest
import os
import json
import importlib
from pathlib import Path
import summit.flags
import summit.cli.fs_research
from summit.cli.fs_research import main

def test_cli_full_run(tmp_path):
    ws_root = tmp_path / "full_ws"

    # Enable feature flag for the test
    os.environ["FS_RESEARCHER_ENABLED"] = "1"
    importlib.reload(summit.flags)
    importlib.reload(summit.cli.fs_research)
    from summit.cli.fs_research import main

    try:
        args = ["--query", "Space Exploration", "--workspace", str(ws_root)]
        exit_code = main(args)

        assert exit_code == 0
        assert ws_root.exists()
        assert (ws_root / "artifacts" / "metrics.json").exists()
        assert (ws_root / "artifacts" / "report.json").exists()
        assert (ws_root / "artifacts" / "stamp.json").exists()

        # Verify deterministic outputs
        with open(ws_root / "artifacts" / "report.json", "r") as f:
            report = json.load(f)
            assert report["status"] == "COMPLETED"
            assert "Introduction" in report["sections"]

    finally:
        if "FS_RESEARCHER_ENABLED" in os.environ:
            del os.environ["FS_RESEARCHER_ENABLED"]

def test_cli_disabled(tmp_path):
    ws_root = tmp_path / "disabled_ws"
    os.environ["FS_RESEARCHER_ENABLED"] = "0"
    importlib.reload(summit.flags)
    importlib.reload(summit.cli.fs_research)
    from summit.cli.fs_research import main

    try:
        args = ["--query", "Disabled Test", "--workspace", str(ws_root)]
        exit_code = main(args)
        assert exit_code == 1
    finally:
        if "FS_RESEARCHER_ENABLED" in os.environ:
            del os.environ["FS_RESEARCHER_ENABLED"]
