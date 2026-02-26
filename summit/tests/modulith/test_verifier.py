import pytest
import os
from summit.modulith.config import ConfigWrapper, load_config
from summit.modulith.schemas import ModulithConfig, ModuleConfig, ModulithMetrics
from summit.modulith.verifier import verify_imports
from summit.modulith.reporter import generate_reports
from pathlib import Path

@pytest.fixture
def mock_config():
    config = ModulithConfig(
        modules={
            "core": ModuleConfig(path="summit/core", allowed_dependencies=[]),
            "ingest": ModuleConfig(path="summit/ingest", allowed_dependencies=["core"]),
            "policy": ModuleConfig(path="summit/policy", allowed_dependencies=["core"])
        },
        rules={"cross_module_requires_event": True}
    )
    return ConfigWrapper(config)

def test_verify_imports_allowed(mock_config):
    import_graph = {
        "summit/ingest/pipeline.py": [("summit.core.events", 10)]
    }
    violations = verify_imports(import_graph, mock_config)
    assert len(violations) == 0

def test_verify_imports_disallowed_dependency(mock_config):
    # core depends on ingest (not allowed)
    import_graph = {
        "summit/core/main.py": [("summit.ingest.pipeline", 5)]
    }
    violations = verify_imports(import_graph, mock_config)
    assert len(violations) == 1
    assert violations[0].from_module == "core"
    assert violations[0].to_module == "ingest"

def test_verify_imports_missing_event_suffix(mock_config):
    # ingest depends on core, but not via events
    import_graph = {
        "summit/ingest/pipeline.py": [("summit.core.utils", 10)]
    }
    violations = verify_imports(import_graph, mock_config)
    assert len(violations) == 1
    assert violations[0].from_module == "ingest"
    assert violations[0].to_module == "core"
    assert "events" not in violations[0].import_path

def test_generate_reports(tmp_path):
    os.environ["CI"] = "true"
    output_dir = tmp_path / "artifacts"

    metrics = ModulithMetrics(
        total_files_scanned=10,
        total_violations=0,
        scan_time_seconds=0.5
    )

    generate_reports([], metrics, str(output_dir))

    assert (output_dir / "report.json").exists()
    assert (output_dir / "metrics.json").exists()
    assert (output_dir / "stamp.json").exists()

    import json
    with open(output_dir / "stamp.json") as f:
        stamp = json.load(f)
        assert stamp["generated_at_utc"] == "2025-01-01T00:00:00Z"
