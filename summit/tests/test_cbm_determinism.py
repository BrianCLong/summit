"""CBM determinism tests — PR1.

Verifies:
1. Disabled pipeline returns stable output (no write side-effects).
2. run_cbm with enabled=True produces identical outputs across two calls
   with identical inputs (determinism gate).
3. run_cbm with enabled=True produces DIFFERENT run_hash when inputs differ.
4. Evidence IDs follow the required pattern.
5. Artifacts contain only sorted keys and lists (no nondeterministic ordering).
6. No wall-clock timestamps appear in artifacts.
7. Fingerprint is stable across calls.
"""

from __future__ import annotations

import json
import re
from pathlib import Path

import pytest

from summit.cbm import CBMConfig, DocumentEvent, run_cbm
from summit.cbm.schema import compute_run_hash, make_evidence_id

# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

FIXED_RUN_DATE = "20260305"

SAMPLE_EVENTS = [
    DocumentEvent(
        doc_id="doc-001",
        source="example.com",
        text="Narrative A text.",
        locale="en",
        platform="rss",
        ts_epoch=1000000,
    ),
    DocumentEvent(
        doc_id="doc-002",
        source="example.org",
        text="Narrative B text.",
        locale="en",
        platform="export",
        ts_epoch=1000001,
    ),
]

EVIDENCE_ID_RE = re.compile(r"^EVID-CBM-\d{8}-[0-9A-F]{8}-\d{4}$")


@pytest.fixture
def tmp_artifact_dir(tmp_path: Path) -> Path:
    return tmp_path / "artifacts" / "cbm"


@pytest.fixture
def cbm_cfg_disabled() -> CBMConfig:
    return CBMConfig(enabled=False, run_date=FIXED_RUN_DATE)


@pytest.fixture
def cbm_cfg_enabled(tmp_artifact_dir: Path) -> CBMConfig:
    return CBMConfig(
        enabled=True,
        llm_probe_enabled=False,
        hybrid_correlation_enabled=False,
        run_date=FIXED_RUN_DATE,
        artifact_dir=str(tmp_artifact_dir),
    )


# ---------------------------------------------------------------------------
# Disabled pipeline
# ---------------------------------------------------------------------------


def test_disabled_returns_stable_output(cbm_cfg_disabled: CBMConfig) -> None:
    result1 = run_cbm([], cbm_cfg_disabled)
    result2 = run_cbm(SAMPLE_EVENTS, cbm_cfg_disabled)
    assert result1 == {"status": "disabled", "artifacts": {}}
    assert result2 == {"status": "disabled", "artifacts": {}}


def test_disabled_writes_no_artifacts(
    cbm_cfg_disabled: CBMConfig, tmp_path: Path
) -> None:
    cfg = CBMConfig(
        enabled=False,
        run_date=FIXED_RUN_DATE,
        artifact_dir=str(tmp_path / "should-not-exist"),
    )
    run_cbm(SAMPLE_EVENTS, cfg)
    assert not (tmp_path / "should-not-exist").exists()


# ---------------------------------------------------------------------------
# Determinism: same inputs → same outputs
# ---------------------------------------------------------------------------


def test_run_hash_determinism(cbm_cfg_enabled: CBMConfig) -> None:
    """Two runs with identical config + inputs must produce identical run_hash."""
    r1 = run_cbm(iter(SAMPLE_EVENTS), cbm_cfg_enabled)
    r2 = run_cbm(iter(SAMPLE_EVENTS), cbm_cfg_enabled)
    assert r1["status"] in ("ok", "partial")
    assert r2["status"] in ("ok", "partial")
    assert r1["evidence_id"] == r2["evidence_id"]


def test_artifact_content_determinism(
    cbm_cfg_enabled: CBMConfig, tmp_artifact_dir: Path
) -> None:
    """Artifact content must be byte-identical across two identical runs."""
    run_cbm(list(SAMPLE_EVENTS), cbm_cfg_enabled)
    stamp1 = (tmp_artifact_dir / "stamp.json").read_text()

    # Reset artifact dir to get a fresh write
    import shutil
    shutil.rmtree(str(tmp_artifact_dir))

    run_cbm(list(SAMPLE_EVENTS), cbm_cfg_enabled)
    stamp2 = (tmp_artifact_dir / "stamp.json").read_text()

    assert stamp1 == stamp2


# ---------------------------------------------------------------------------
# Different inputs → different run_hash
# ---------------------------------------------------------------------------


def test_different_inputs_different_hash(
    cbm_cfg_enabled: CBMConfig, tmp_path: Path
) -> None:
    cfg_a = CBMConfig(
        enabled=True,
        run_date=FIXED_RUN_DATE,
        artifact_dir=str(tmp_path / "a"),
    )
    cfg_b = CBMConfig(
        enabled=True,
        run_date=FIXED_RUN_DATE,
        artifact_dir=str(tmp_path / "b"),
    )

    r_a = run_cbm(list(SAMPLE_EVENTS), cfg_a)
    r_b = run_cbm(
        [DocumentEvent(doc_id="other-doc", source="other.com", text="Other.")],
        cfg_b,
    )

    assert r_a["evidence_id"] != r_b["evidence_id"]


# ---------------------------------------------------------------------------
# Evidence ID format
# ---------------------------------------------------------------------------


def test_evidence_id_format(cbm_cfg_enabled: CBMConfig) -> None:
    result = run_cbm(list(SAMPLE_EVENTS), cbm_cfg_enabled)
    evid = result["evidence_id"]
    assert EVIDENCE_ID_RE.match(evid), f"Bad evidence ID format: {evid!r}"
    # run_date embedded in evidence ID must match config
    assert evid.startswith(f"EVID-CBM-{FIXED_RUN_DATE}-")


def test_make_evidence_id_format() -> None:
    evid = make_evidence_id("20260305", "abcdef1234567890", seq=7)
    assert evid == "EVID-CBM-20260305-ABCDEF12-0007"
    assert EVIDENCE_ID_RE.match(evid)


# ---------------------------------------------------------------------------
# No wall-clock timestamps in artifacts
# ---------------------------------------------------------------------------


_TIMESTAMP_PATTERNS = [
    re.compile(r"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}"),  # ISO 8601
    re.compile(r"\"generated_at\""),
    re.compile(r"\"timestamp\""),
    re.compile(r"\"created_at\""),
    re.compile(r"\"updated_at\""),
]


def test_no_wall_clock_timestamps_in_stamp(
    cbm_cfg_enabled: CBMConfig, tmp_artifact_dir: Path
) -> None:
    run_cbm(list(SAMPLE_EVENTS), cbm_cfg_enabled)
    stamp_text = (tmp_artifact_dir / "stamp.json").read_text()
    for pat in _TIMESTAMP_PATTERNS:
        assert not pat.search(stamp_text), (
            f"Wall-clock timestamp pattern {pat.pattern!r} found in stamp.json"
        )


# ---------------------------------------------------------------------------
# Artifact JSON keys are sorted
# ---------------------------------------------------------------------------


def test_artifact_keys_sorted(
    cbm_cfg_enabled: CBMConfig, tmp_artifact_dir: Path
) -> None:
    run_cbm(list(SAMPLE_EVENTS), cbm_cfg_enabled)
    for artifact_file in tmp_artifact_dir.glob("*.json"):
        data = json.loads(artifact_file.read_text())
        keys = list(data.keys())
        assert keys == sorted(keys), (
            f"{artifact_file.name}: keys not sorted: {keys}"
        )


# ---------------------------------------------------------------------------
# Artifact schema: stamp.json required fields
# ---------------------------------------------------------------------------


def test_stamp_required_fields(
    cbm_cfg_enabled: CBMConfig, tmp_artifact_dir: Path
) -> None:
    run_cbm(list(SAMPLE_EVENTS), cbm_cfg_enabled)
    stamp = json.loads((tmp_artifact_dir / "stamp.json").read_text())
    required = {"config", "evidence_id", "input_count", "run_date", "run_hash", "status"}
    assert required <= set(stamp.keys()), (
        f"stamp.json missing fields: {required - set(stamp.keys())}"
    )
    assert stamp["run_date"] == FIXED_RUN_DATE
    assert stamp["input_count"] == len(SAMPLE_EVENTS)
    assert stamp["status"] in ("ok", "partial", "failed")


# ---------------------------------------------------------------------------
# Feature flags default OFF
# ---------------------------------------------------------------------------


def test_feature_flags_default_off() -> None:
    cfg = CBMConfig()
    assert cfg.enabled is False
    assert cfg.llm_probe_enabled is False
    assert cfg.hybrid_correlation_enabled is False


def test_llm_probe_disabled_by_default(
    cbm_cfg_enabled: CBMConfig, tmp_artifact_dir: Path
) -> None:
    run_cbm(list(SAMPLE_EVENTS), cbm_cfg_enabled)
    ai_exposure = json.loads((tmp_artifact_dir / "ai_exposure.json").read_text())
    assert ai_exposure.get("status") == "disabled"


# ---------------------------------------------------------------------------
# DocumentEvent fingerprint stability
# ---------------------------------------------------------------------------


def test_document_event_fingerprint_stable() -> None:
    evt = DocumentEvent(
        doc_id="fp-test",
        source="test.com",
        text="stable text",
        locale="en",
        platform="rss",
    )
    fp1 = evt.fingerprint()
    fp2 = evt.fingerprint()
    assert fp1 == fp2
    assert len(fp1) == 64  # SHA-256 hex


def test_document_event_fingerprint_changes_on_content() -> None:
    base = DocumentEvent(doc_id="x", source="s", text="original")
    alt = DocumentEvent(doc_id="x", source="s", text="different")
    assert base.fingerprint() != alt.fingerprint()


# ---------------------------------------------------------------------------
# compute_run_hash stability
# ---------------------------------------------------------------------------


def test_compute_run_hash_stable() -> None:
    cfg = {"enabled": True, "run_date": "20260305"}
    fps = ["aaa", "bbb", "ccc"]
    h1 = compute_run_hash(cfg, fps)
    h2 = compute_run_hash(cfg, fps)
    assert h1 == h2
    assert len(h1) == 64


def test_compute_run_hash_input_order_independent() -> None:
    """Fingerprint list order must not affect the run hash (inputs are sorted)."""
    cfg = {"enabled": True}
    h1 = compute_run_hash(cfg, ["aaa", "bbb", "ccc"])
    h2 = compute_run_hash(cfg, ["ccc", "aaa", "bbb"])
    assert h1 == h2
