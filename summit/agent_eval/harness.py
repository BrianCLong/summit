from __future__ import annotations

import os
from pathlib import Path
from typing import Any

from .schema import detect_nondeterministic_markers, sha256_file, stable_json, stable_payload_hash


def _is_enabled(name: str, default: bool = False) -> bool:
    value = os.getenv(name, str(default)).strip().lower()
    return value in {"1", "true", "t", "yes", "y"}


def _write_json(path: Path, data: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(stable_json(data), encoding="utf-8")


class AgentEvalHarness:
    def __init__(self, gates_enabled: bool | None = None) -> None:
        self.gates_enabled = _is_enabled("SUMMIT_AGENT_GATES", False) if gates_enabled is None else gates_enabled

    def evaluate(
        self,
        artifact_path: str,
        output_dir: str | None = None,
        *,
        agent_model: str = "unknown",
        prompt_hash: str = "sha256:unknown",
    ) -> dict[str, dict[str, Any]]:
        artifact = Path(artifact_path)
        if not artifact.exists():
            raise FileNotFoundError(f"Artifact path not found: {artifact}")

        contents = artifact.read_text(encoding="utf-8", errors="replace")
        input_hash = sha256_file(artifact)
        nondeterministic_markers = detect_nondeterministic_markers(contents)
        evaluation_score = 0.0 if nondeterministic_markers else 1.0

        eval_payload = {
            "artifact_path": str(artifact),
            "evaluation_score": evaluation_score,
            "markers": nondeterministic_markers,
        }
        output_hash = stable_payload_hash(eval_payload)
        evidence_id = f"EVD-AGENT-EVAL-{input_hash[:12].upper()}"

        report = {
            "evidence_id": evidence_id,
            "agent_model": agent_model,
            "prompt_hash": prompt_hash,
            "input_hash": input_hash,
            "output_hash": output_hash,
            "evaluation_score": evaluation_score,
            "status": "pass" if evaluation_score >= 1.0 else "fail",
            "artifact_path": str(artifact),
            "nondeterministic_markers": nondeterministic_markers,
            "gating_mode": "enforced" if self.gates_enabled else "observe",
        }
        metrics = {
            "evidence_id": evidence_id,
            "evaluation_score": evaluation_score,
            "input_hash": input_hash,
            "output_hash": output_hash,
            "deterministic": len(nondeterministic_markers) == 0,
            "marker_count": len(nondeterministic_markers),
        }
        stamp = {
            "evidence_id": evidence_id,
            "input_hash": input_hash,
            "output_hash": output_hash,
            "deterministic": len(nondeterministic_markers) == 0,
            "schema_version": "1.0.0",
            "gates_enabled": self.gates_enabled,
        }

        if output_dir is not None:
            out = Path(output_dir)
            _write_json(out / "report.json", report)
            _write_json(out / "metrics.json", metrics)
            _write_json(out / "stamp.json", stamp)

        return {"report": report, "metrics": metrics, "stamp": stamp}

