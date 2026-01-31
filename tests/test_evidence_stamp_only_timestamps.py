import importlib.util
from pathlib import Path


def load_verify_module() -> object:
    root = Path(__file__).resolve().parents[1]
    module_path = root / "ci" / "verify_evidence.py"
    spec = importlib.util.spec_from_file_location("verify_evidence", module_path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_timestamps_only_in_stamp_json(tmp_path):
    module = load_verify_module()
    evidence_dir = tmp_path / "evidence"
    evidence_dir.mkdir()

    (evidence_dir / "stamp.json").write_text(
        '{"generated_at": "2026-01-30T00:00:00Z"}',
        encoding="utf-8",
    )
    (evidence_dir / "report.json").write_text(
        '{"status": "ok"}',
        encoding="utf-8",
    )

    module.verify_timestamps(tmp_path)
