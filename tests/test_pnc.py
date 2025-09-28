from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))


from tools.pnc import attest, report, verify


def _write_json(path: Path, data: dict) -> Path:
    path.write_text(json.dumps(data, indent=2, sort_keys=True))
    return path


def test_attestation_generation_and_verification(tmp_path: Path) -> None:
    signing_key = "super-secret"
    trace_path = tmp_path / "trace.json"
    allowlist_path = tmp_path / "allow.json"
    denylist_path = tmp_path / "deny.json"
    output_path = tmp_path / "bundle.json"

    _write_json(
        trace_path,
        {
            "job_id": "job-123",
            "query_id": "query-abc",
            "timestamp": "2025-09-01T12:00:00Z",
            "touched": ["tenantA:field1", "tenantA:field2"],
            "epsilon": 0.5,
            "delta": 1e-6,
        },
    )
    _write_json(
        allowlist_path,
        {
            "selectors": ["tenantA:field1", "tenantA:field2", "tenantB:field1"],
            "metadata": {"epsilon": 0.75, "delta": 1e-5},
        },
    )
    _write_json(
        denylist_path,
        {
            "selectors": ["tenantB:restricted"],
        },
    )

    bundle = attest.generate_attestation(
        trace_path=trace_path,
        allowlist_path=allowlist_path,
        denylist_path=denylist_path,
        output_path=output_path,
        signing_key=signing_key,
        key_id="k1",
    )

    assert output_path.exists()
    assert bundle["payload"]["status"] == "pass"
    assert bundle["payload"]["metrics"]["denylist_hits"] == []
    assert bundle["payload"]["metrics"]["allowlist_coverage"] == 1.0
    assert bundle["payload"]["dp_leakage"]["epsilon"] == 0.75

    result = verify.verify_bundle(
        bundle_path=output_path,
        allowlist_path=allowlist_path,
        denylist_path=denylist_path,
        signing_key=signing_key,
    )
    assert result.ok


def test_monthly_report(tmp_path: Path) -> None:
    signing_key = "another-secret"
    allowlist_path = tmp_path / "allow.json"
    denylist_path = tmp_path / "deny.json"
    bundle_dir = tmp_path / "bundles"
    bundle_dir.mkdir()

    _write_json(
        allowlist_path,
        {
            "selectors": ["tenantA:field1", "tenantB:field2"],
            "metadata": {"epsilon": 1.0, "delta": 1e-6},
        },
    )
    _write_json(
        denylist_path,
        {"selectors": ["tenantB:restricted", "tenantC:secret"]},
    )

    # Passing job
    pass_trace = tmp_path / "pass-trace.json"
    _write_json(
        pass_trace,
        {
            "job_id": "job-pass",
            "query_id": "q-pass",
            "timestamp": "2025-09-15T10:00:00Z",
            "touched": ["tenantA:field1"],
        },
    )
    attest.generate_attestation(
        trace_path=pass_trace,
        allowlist_path=allowlist_path,
        denylist_path=denylist_path,
        output_path=bundle_dir / "pass.json",
        signing_key=signing_key,
        key_id="k2",
    )

    # Failing job due to denylist hit
    fail_trace = tmp_path / "fail-trace.json"
    _write_json(
        fail_trace,
        {
            "job_id": "job-fail",
            "query_id": "q-fail",
            "timestamp": "2025-09-20T09:00:00Z",
            "touched": ["tenantB:restricted"],
        },
    )
    attest.generate_attestation(
        trace_path=fail_trace,
        allowlist_path=allowlist_path,
        denylist_path=denylist_path,
        output_path=bundle_dir / "fail.json",
        signing_key=signing_key,
        key_id="k2",
    )

    report_data = report.aggregate_reports(sorted(bundle_dir.glob("*.json")))
    assert report_data["schema"] == "pnc.report/1.0"
    assert len(report_data["months"]) == 1
    month = report_data["months"][0]
    assert month["attestations"]["pass"] == 1
    assert month["attestations"]["fail"] == 1
    assert month["coverage"]["denylist_proofs"] >= 1
