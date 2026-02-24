#!/usr/bin/env python3
"""Deterministic tooling agent scaffold for Summit internal workflows."""

from __future__ import annotations

import hashlib
import json
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict


def _canonical_json(value: Any) -> str:
    return json.dumps(value, sort_keys=True, separators=(",", ":"))


def _stable_hash(value: Any) -> str:
    return hashlib.sha256(_canonical_json(value).encode("utf-8")).hexdigest()


def _task_slug(task: str) -> str:
    slug = re.sub(r"[^A-Z0-9]+", "-", task.upper()).strip("-")
    return slug or "TASK"


def sanitize_task(task: str) -> tuple[str, bool]:
    """Return sanitized task and whether prompt-injection signals were observed."""
    normalized = " ".join(task.strip().split())
    lowered = normalized.lower()
    indicators = (
        "ignore previous",
        "system prompt",
        "<script",
        "```",
        "{{",
        "}}",
    )
    injection_detected = any(token in lowered for token in indicators)
    safe = re.sub(r"[^A-Za-z0-9 .,_:/-]+", "", normalized)
    return safe[:160], injection_detected


@dataclass(frozen=True)
class ToolingTaskConfig:
    task: str
    repo_root: Path
    enabled: bool
    prompt_path: Path
    git_sha: str


class ToolingAgent:
    """Small deterministic agent that emits evidence artifacts."""

    SCHEMA_VERSION = "1.0.0"

    def __init__(self, task_config: ToolingTaskConfig):
        self.task_config = task_config

    def _load_prompt_text(self) -> str:
        prompt_path = self.task_config.prompt_path
        if not prompt_path.exists():
            return "PROMPT-MISSING"
        return prompt_path.read_text(encoding="utf-8")

    def _evidence_id(self) -> str:
        safe_task, _ = sanitize_task(self.task_config.task)
        fingerprint_source = {
            "task": safe_task,
            "prompt": self._load_prompt_text(),
            "schema_version": self.SCHEMA_VERSION,
        }
        digest = _stable_hash(fingerprint_source)[:12]
        return f"TOOLING-{_task_slug(safe_task)}-{digest}"

    @staticmethod
    def compute_evidence_hash(evidence_id: str, report: Dict[str, Any], metrics: Dict[str, Any]) -> str:
        return _stable_hash(
            {
                "evidence_id": evidence_id,
                "report": report,
                "metrics": metrics,
            }
        )

    def _report(self, evidence_id: str, safe_task: str, injection_detected: bool) -> Dict[str, Any]:
        enabled = self.task_config.enabled
        status = "blocked" if injection_detected else ("ready" if enabled else "disabled")
        summary = (
            "Tooling agent blocked task due to prompt-injection indicators."
            if injection_detected
            else (
            "Tooling agent executed deterministic scaffold path."
            if enabled
            else "Tooling agent intentionally constrained by feature flag."
            )
        )

        return {
            "evidence_id": evidence_id,
            "task": safe_task,
            "status": status,
            "title": "Summit Tooling Agent MWS",
            "summary": summary,
            "maestro_layers": [
                "Agents",
                "Tools",
                "Observability",
                "Security",
            ],
            "threats_considered": [
                "prompt_injection",
                "artifact_tampering",
                "tool_abuse",
            ],
            "mitigations": [
                "feature_flag_default_off",
                "deterministic_artifacts",
                "schema_validation_gate",
            ],
            "decisions": [
                "Intentionally constrained scope to deterministic local execution.",
                "Deferred pending human countersign for policy-layer expansion.",
            ],
            "injection_detected": injection_detected,
            "artifacts": ["report.json", "metrics.json", "stamp.json"],
        }

    def _metrics(self, evidence_id: str, safe_task: str) -> Dict[str, Any]:
        return {
            "evidence_id": evidence_id,
            "task": safe_task,
            "deterministic": True,
            "runtime_budget_ms": 5000,
            "memory_budget_mb": 256,
            "artifact_size_budget_bytes": 512000,
        }

    def _stamp(self, evidence_id: str, safe_task: str, report: Dict[str, Any], metrics: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "evidence_id": evidence_id,
            "task": safe_task,
            "schema_version": self.SCHEMA_VERSION,
            "evidence_hash": self.compute_evidence_hash(evidence_id, report, metrics),
            "git_sha": self.task_config.git_sha,
        }

    def run(self) -> Dict[str, Dict[str, Any]]:
        safe_task, injection_detected = sanitize_task(self.task_config.task)
        evidence_id = self._evidence_id()
        report = self._report(evidence_id, safe_task, injection_detected)
        metrics = self._metrics(evidence_id, safe_task)
        stamp = self._stamp(evidence_id, safe_task, report, metrics)
        return {
            "report": report,
            "metrics": metrics,
            "stamp": stamp,
        }
