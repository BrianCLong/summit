"""CBM pipeline entry point.

Stages (stubbed; implemented in subsequent PRs):
  1. normalize  → DocumentEvent stream
  2. extract    → claims, entities, locale (PR2)
  3. cluster    → narrative graph (PR2)
  4. coordinate → influence graph (PR3)
  5. void_score → authority density (PR4)
  6. ai_probe   → AI exposure graph (PR5, flagged)
  7. correlate  → hybrid incidents (PR5, flagged)
  8. emit       → deterministic artifacts

Feature flags (all default OFF):
  cbm_enabled                — master switch
  cbm_llm_probe_enabled      — AI probe stage
  cbm_hybrid_correlation_enabled — incident correlation

On any gate failure, emits artifacts/cbm/failures.json and exits non-zero.
"""

from __future__ import annotations

import json
import logging
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any, Dict, Iterable, List

from .schema import (
    DocumentEvent,
    FailureRecord,
    FailuresArtifact,
    StampArtifact,
    compute_run_hash,
    make_evidence_id,
)

logger = logging.getLogger(__name__)

_ARTIFACT_DIR = Path("artifacts/cbm")


# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class CBMConfig:
    """Feature-flagged configuration for the CBM pipeline.

    All flags default to OFF. Operators must explicitly enable.

    Attributes:
        enabled:                    Master switch. If False, pipeline returns
                                    immediately with status="disabled".
        llm_probe_enabled:          Enable AI Exposure Graph probe stage (PR5).
        hybrid_correlation_enabled: Enable incident-correlation stage (PR5).
        run_date:                   YYYYMMDD string used in Evidence IDs and
                                    artifact stamping. MUST be set by operator
                                    or test harness; never read from wall-clock.
        artifact_dir:               Output directory for deterministic artifacts.
    """

    enabled: bool = False
    llm_probe_enabled: bool = False
    hybrid_correlation_enabled: bool = False
    run_date: str = "19700101"
    artifact_dir: str = str(_ARTIFACT_DIR)

    def to_dict(self) -> dict[str, Any]:
        return {
            "enabled": self.enabled,
            "llm_probe_enabled": self.llm_probe_enabled,
            "hybrid_correlation_enabled": self.hybrid_correlation_enabled,
            "run_date": self.run_date,
            "artifact_dir": self.artifact_dir,
        }


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------


def _write_artifact(artifact_dir: Path, name: str, data: Any) -> None:
    """Write a deterministic JSON artifact with sorted keys."""
    artifact_dir.mkdir(parents=True, exist_ok=True)
    path = artifact_dir / name
    path.write_text(json.dumps(data, sort_keys=True, indent=2))
    logger.info("cbm artifact written path=%s", path)


def _collect_events(events: Iterable[DocumentEvent]) -> list[DocumentEvent]:
    """Materialize and validate the event stream."""
    collected: list[DocumentEvent] = []
    for evt in events:
        if not isinstance(evt, DocumentEvent):
            raise TypeError(f"Expected DocumentEvent, got {type(evt)}")
        collected.append(evt)
    return collected


# ---------------------------------------------------------------------------
# Pipeline stages (stubs for PR1; full impl in subsequent PRs)
# ---------------------------------------------------------------------------


def _stage_normalize(events: list[DocumentEvent]) -> list[DocumentEvent]:
    """PR1 stub: pass-through; validation in subsequent PRs."""
    return events


def _stage_extract(events: list[DocumentEvent]) -> dict[str, Any]:
    """PR2 stub: claim/entity extraction."""
    return {"claims": [], "entities": [], "locales": []}


def _stage_cluster(extracted: dict[str, Any]) -> dict[str, Any]:
    """PR2 stub: narrative clustering."""
    return {"narratives": []}


def _stage_coordinate(events: list[DocumentEvent]) -> dict[str, Any]:
    """PR3 stub: coordination detection."""
    return {"coordination_cells": [], "signal_ledger": []}


def _stage_void_score(extracted: dict[str, Any]) -> dict[str, Any]:
    """PR4 stub: data-void authority density scoring."""
    return {"void_scores": []}


def _stage_ai_probe(
    narratives: dict[str, Any], cfg: CBMConfig
) -> dict[str, Any]:
    """PR5 stub: AI exposure graph probe (requires llm_probe_enabled)."""
    if not cfg.llm_probe_enabled:
        return {"status": "disabled"}
    return {"ai_exposure": [], "laundering_risk": []}


def _stage_correlate(
    narratives: dict[str, Any], cfg: CBMConfig
) -> dict[str, Any]:
    """PR5 stub: hybrid incident correlation (requires hybrid_correlation_enabled)."""
    if not cfg.hybrid_correlation_enabled:
        return {"status": "disabled"}
    return {"incident_correlations": []}


# ---------------------------------------------------------------------------
# Public entry point
# ---------------------------------------------------------------------------


def run_cbm(
    events: Iterable[dict[str, Any] | DocumentEvent],
    cfg: CBMConfig,
) -> dict[str, Any]:
    """Run the full CBM pipeline.

    Args:
        events: Iterable of DocumentEvent or raw dicts (auto-promoted).
        cfg:    CBMConfig with feature flags and run metadata.

    Returns:
        Result dict with keys: status, artifacts, evidence_id.
        On failure: also writes artifacts/cbm/failures.json and includes
        'failures' key.

    Side effects:
        Writes deterministic JSON artifacts under cfg.artifact_dir.
        Never reads wall-clock time; all temporal metadata from cfg.run_date.
    """
    artifact_dir = Path(cfg.artifact_dir)

    if not cfg.enabled:
        logger.info("cbm pipeline disabled (cbm_enabled=False)")
        return {"status": "disabled", "artifacts": {}}

    failures: list[FailureRecord] = []
    artifacts_written: dict[str, str] = {}

    # Promote raw dicts to DocumentEvent
    def _coerce(e: Any) -> DocumentEvent:
        if isinstance(e, DocumentEvent):
            return e
        return DocumentEvent(**e)

    try:
        raw = list(events)
        doc_events = [_coerce(e) for e in raw]
    except Exception as exc:  # noqa: BLE001
        failures.append(FailureRecord(stage="ingest", error=str(exc)))
        doc_events = []

    # Compute deterministic run hash from config + input fingerprints
    input_fps = sorted(e.fingerprint() for e in doc_events)
    run_hash = compute_run_hash(cfg.to_dict(), input_fps)
    evidence_id = make_evidence_id(cfg.run_date, run_hash, seq=0)

    logger.info(
        "cbm pipeline started evidence_id=%s doc_count=%d",
        evidence_id,
        len(doc_events),
    )

    # --- Stage 1: normalize ---
    try:
        normalized = _stage_normalize(doc_events)
    except Exception as exc:  # noqa: BLE001
        failures.append(FailureRecord(stage="normalize", error=str(exc)))
        normalized = doc_events

    # --- Stage 2: extract ---
    extracted: dict[str, Any] = {}
    try:
        extracted = _stage_extract(normalized)
    except Exception as exc:  # noqa: BLE001
        failures.append(FailureRecord(stage="extract", error=str(exc)))

    # --- Stage 3: cluster ---
    narratives: dict[str, Any] = {}
    try:
        narratives = _stage_cluster(extracted)
    except Exception as exc:  # noqa: BLE001
        failures.append(FailureRecord(stage="cluster", error=str(exc)))

    # --- Stage 4: coordinate ---
    coordination: dict[str, Any] = {}
    try:
        coordination = _stage_coordinate(normalized)
    except Exception as exc:  # noqa: BLE001
        failures.append(FailureRecord(stage="coordinate", error=str(exc)))

    # --- Stage 5: void score ---
    void_data: dict[str, Any] = {}
    try:
        void_data = _stage_void_score(extracted)
    except Exception as exc:  # noqa: BLE001
        failures.append(FailureRecord(stage="void_score", error=str(exc)))

    # --- Stage 6: AI probe (flagged) ---
    ai_data: dict[str, Any] = {}
    try:
        ai_data = _stage_ai_probe(narratives, cfg)
    except Exception as exc:  # noqa: BLE001
        failures.append(FailureRecord(stage="ai_probe", error=str(exc)))

    # --- Stage 7: incident correlation (flagged) ---
    correlation_data: dict[str, Any] = {}
    try:
        correlation_data = _stage_correlate(narratives, cfg)
    except Exception as exc:  # noqa: BLE001
        failures.append(FailureRecord(stage="correlate", error=str(exc)))

    # --- Stage 8: emit artifacts ---
    stamp = StampArtifact(
        evidence_id=evidence_id,
        run_hash=run_hash,
        run_date=cfg.run_date,
        config=cfg.to_dict(),
        input_count=len(doc_events),
        status="ok" if not failures else "partial",
    )

    try:
        _write_artifact(artifact_dir, "stamp.json", stamp.to_dict())
        artifacts_written["stamp.json"] = str(artifact_dir / "stamp.json")

        _write_artifact(artifact_dir, "narratives.json", {
            "evidence_id": make_evidence_id(cfg.run_date, run_hash, seq=1),
            **narratives,
        })
        artifacts_written["narratives.json"] = str(artifact_dir / "narratives.json")

        _write_artifact(artifact_dir, "influence_graph.json", {
            "evidence_id": make_evidence_id(cfg.run_date, run_hash, seq=2),
            **coordination,
        })
        artifacts_written["influence_graph.json"] = str(
            artifact_dir / "influence_graph.json"
        )

        _write_artifact(artifact_dir, "data_void_risk.json", {
            "evidence_id": make_evidence_id(cfg.run_date, run_hash, seq=3),
            **void_data,
        })
        artifacts_written["data_void_risk.json"] = str(
            artifact_dir / "data_void_risk.json"
        )

        _write_artifact(artifact_dir, "ai_exposure.json", {
            "evidence_id": make_evidence_id(cfg.run_date, run_hash, seq=4),
            **ai_data,
        })
        artifacts_written["ai_exposure.json"] = str(
            artifact_dir / "ai_exposure.json"
        )

    except Exception as exc:  # noqa: BLE001
        failures.append(FailureRecord(stage="emit", error=str(exc)))

    # Emit failures artifact if any failures occurred
    if failures:
        fail_artifact = FailuresArtifact(run_hash=run_hash, failures=failures)
        try:
            _write_artifact(
                artifact_dir, "failures.json", fail_artifact.to_dict()
            )
            artifacts_written["failures.json"] = str(
                artifact_dir / "failures.json"
            )
        except Exception:  # noqa: BLE001
            logger.exception("failed to write failures.json")

        logger.warning(
            "cbm pipeline completed with failures count=%d evidence_id=%s",
            len(failures),
            evidence_id,
        )
        return {
            "status": "partial",
            "evidence_id": evidence_id,
            "artifacts": artifacts_written,
            "failures": [f.to_dict() for f in failures],
        }

    logger.info("cbm pipeline ok evidence_id=%s", evidence_id)
    return {
        "status": "ok",
        "evidence_id": evidence_id,
        "artifacts": artifacts_written,
    }
