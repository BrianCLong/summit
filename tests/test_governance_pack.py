from __future__ import annotations

import copy
import importlib.util
import json
import re
import subprocess
import sys
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parents[1]
MODULE_PATH = REPO_ROOT / "scripts/governance/generate_pack.py"

spec = importlib.util.spec_from_file_location("generate_pack", MODULE_PATH)
module = importlib.util.module_from_spec(spec)
assert spec and spec.loader
spec.loader.exec_module(module)

EVIDENCE_ID_PATTERN = re.compile(r"^SUMMIT-GOV-[a-z0-9-]+-\d{3}$")


def _load(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def _write(path: Path, payload: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def _prepare_repo(tmp_path: Path, payload: dict) -> tuple[Path, Path, Path]:
    schema_path = tmp_path / "governance/schema/governance.schema.json"
    schema_path.parent.mkdir(parents=True, exist_ok=True)
    schema_path.write_text(
        (REPO_ROOT / "governance/schema/governance.schema.json").read_text(encoding="utf-8"),
        encoding="utf-8",
    )

    fixture_root = tmp_path / "tests/fixtures/abuse_cases/one-engineer-production-saas-governance"
    fixture_root.mkdir(parents=True, exist_ok=True)
    fixture_root.joinpath("prompt_injection.json").write_text(
        (REPO_ROOT / "tests/fixtures/abuse_cases/one-engineer-production-saas-governance/prompt_injection.json").read_text(
            encoding="utf-8"
        ),
        encoding="utf-8",
    )
    fixture_root.joinpath("data_exfiltration.json").write_text(
        (REPO_ROOT / "tests/fixtures/abuse_cases/one-engineer-production-saas-governance/data_exfiltration.json").read_text(
            encoding="utf-8"
        ),
        encoding="utf-8",
    )

    spec_path = tmp_path / "governance/one-engineer-production-saas-governance/input.spec.json"
    _write(spec_path, payload)

    out_root = tmp_path / "out"
    return spec_path, out_root, schema_path


def _assert_no_timestamp_keys(value: object) -> None:
    timestamp_keys = {
        "created_at",
        "generated_at",
        "timestamp",
        "ts",
        "createdAt",
        "generatedAt",
    }
    if isinstance(value, dict):
        for key, child in value.items():
            assert key not in timestamp_keys
            _assert_no_timestamp_keys(child)
    elif isinstance(value, list):
        for child in value:
            _assert_no_timestamp_keys(child)


def test_generate_pack_deterministic_and_valid(tmp_path: Path) -> None:
    payload = _load(REPO_ROOT / "tests/fixtures/governance_pack/valid_spec.json")
    spec_path, out_root, schema_path = _prepare_repo(tmp_path, payload)

    report_path, metrics_path, stamp_path = module.generate_pack(
        spec_path=spec_path,
        slug="one-engineer-production-saas-governance",
        output_root=out_root,
        repo_root=tmp_path,
        schema_path=schema_path,
        emit_supporting_artifacts=True,
    )

    first = {
        "report": report_path.read_text(encoding="utf-8"),
        "metrics": metrics_path.read_text(encoding="utf-8"),
        "stamp": stamp_path.read_text(encoding="utf-8"),
    }

    report_path_2, metrics_path_2, stamp_path_2 = module.generate_pack(
        spec_path=spec_path,
        slug="one-engineer-production-saas-governance",
        output_root=out_root,
        repo_root=tmp_path,
        schema_path=schema_path,
        emit_supporting_artifacts=True,
    )

    assert first["report"] == report_path_2.read_text(encoding="utf-8")
    assert first["metrics"] == metrics_path_2.read_text(encoding="utf-8")
    assert first["stamp"] == stamp_path_2.read_text(encoding="utf-8")

    report = _load(report_path)
    metrics = _load(metrics_path)
    stamp = _load(stamp_path)

    _assert_no_timestamp_keys(report)
    _assert_no_timestamp_keys(metrics)

    for evidence_id in report["evidence_ids"]:
        assert EVIDENCE_ID_PATTERN.fullmatch(evidence_id)
    assert EVIDENCE_ID_PATTERN.fullmatch(metrics["evidence_id"])
    assert EVIDENCE_ID_PATTERN.fullmatch(stamp["evidence_id"])

    assert (out_root / "docs/security/data-handling/one-engineer-production-saas-governance.md").exists()
    assert (out_root / "docs/ops/runbooks/one-engineer-production-saas-governance.md").exists()
    assert (out_root / "docs/standards/one-engineer-production-saas-governance.md").exists()
    drift_script = out_root / "scripts/monitoring/one-engineer-production-saas-governance-drift.py"
    assert drift_script.exists()

    drift_ok = subprocess.run(
        [
            sys.executable,
            str(drift_script),
        ],
        check=False,
        cwd=out_root,
        capture_output=True,
        text=True,
    )
    assert drift_ok.returncode == 0
    drift_ok_payload = json.loads(drift_ok.stdout)
    assert drift_ok_payload["drift_detected"] is False
    assert isinstance(drift_ok_payload["current_hash"], str)

    drift_bad = subprocess.run(
        [
            sys.executable,
            str(drift_script),
            "--previous-hash",
            "bad-hash",
            "--fail-on-drift",
        ],
        check=False,
        cwd=out_root,
        capture_output=True,
        text=True,
    )
    assert drift_bad.returncode == 1
    drift_bad_payload = json.loads(drift_bad.stdout)
    assert drift_bad_payload["drift_detected"] is True
    assert "bundle-hash-changed" in drift_bad_payload["drift_reasons"]


@pytest.mark.parametrize(
    "mutator",
    [
        lambda payload: payload.pop("data_classification"),
        lambda payload: payload.update({"threat_model": []}),
        lambda payload: payload.update({"abuse_case_fixtures": []}),
    ],
)
def test_generate_pack_fails_on_required_sections(tmp_path: Path, mutator) -> None:
    payload = _load(REPO_ROOT / "tests/fixtures/governance_pack/valid_spec.json")
    updated = copy.deepcopy(payload)
    mutator(updated)

    spec_path, out_root, schema_path = _prepare_repo(tmp_path, updated)

    with pytest.raises(SystemExit):
        module.generate_pack(
            spec_path=spec_path,
            slug="one-engineer-production-saas-governance",
            output_root=out_root,
            repo_root=tmp_path,
            schema_path=schema_path,
            emit_supporting_artifacts=False,
        )


def test_verify_repo_artifacts_passes(tmp_path: Path) -> None:
    payload = _load(REPO_ROOT / "tests/fixtures/governance_pack/valid_spec.json")
    spec_path, out_root, schema_path = _prepare_repo(tmp_path, payload)

    module.generate_pack(
        spec_path=spec_path,
        slug="one-engineer-production-saas-governance",
        output_root=tmp_path,
        repo_root=tmp_path,
        schema_path=schema_path,
        emit_supporting_artifacts=True,
    )

    assert module.verify_repo_artifacts(tmp_path, schema_path) == 0
    assert out_root != tmp_path


def test_verify_repo_artifacts_fails_on_stale_file(tmp_path: Path) -> None:
    payload = _load(REPO_ROOT / "tests/fixtures/governance_pack/valid_spec.json")
    spec_path, _, schema_path = _prepare_repo(tmp_path, payload)

    module.generate_pack(
        spec_path=spec_path,
        slug="one-engineer-production-saas-governance",
        output_root=tmp_path,
        repo_root=tmp_path,
        schema_path=schema_path,
        emit_supporting_artifacts=True,
    )

    report_path = tmp_path / "governance/one-engineer-production-saas-governance/report.json"
    report = _load(report_path)
    report["title"] = "tampered"
    _write(report_path, report)

    with pytest.raises(SystemExit):
        module.verify_repo_artifacts(tmp_path, schema_path)
