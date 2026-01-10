from __future__ import annotations

import json
import os
import subprocess
import uuid
from pathlib import Path
from typing import Dict, Optional

from .audit import AuditLogger
from .model import JobSpec
from .policy import evaluate_policies
from .store import StateStore
from .validator import validate_spec


class JobRunner:
    def __init__(self, state_root: Path, audit_log: Path):
        self.store = StateStore(state_root)
        self.audit = AuditLogger(audit_log)

    def load_spec_from_path(self, path: Path) -> JobSpec:
        raw = self._read_job_file(path)
        return JobSpec.from_dict(raw)

    def submit(self, spec: JobSpec, job_id: Optional[str] = None) -> str:
        job_id = job_id or str(uuid.uuid4())
        self.store.write_spec(job_id, spec.to_dict())
        self.store.append_state(job_id, "SUBMITTED", "job received")
        self.audit.emit(job_id, spec.trace_id, "SUBMITTED", "job submitted")

        validation_errors = validate_spec(spec)
        if validation_errors:
            detail = "; ".join(validation_errors)
            self.store.append_state(job_id, "DENIED", f"validation failed: {detail}")
            self.audit.emit(job_id, spec.trace_id, "DENIED", detail)
            return job_id

        self.store.append_state(job_id, "VALIDATED", "spec validated")
        self.audit.emit(job_id, spec.trace_id, "VALIDATED", "spec validated")

        policy_result = evaluate_policies(spec)
        if not policy_result.allowed:
            detail = "; ".join(policy_result.reasons)
            self.store.append_state(job_id, "DENIED", f"policy denied: {detail}")
            self.audit.emit(job_id, spec.trace_id, "DENIED", detail)
            return job_id

        self.store.append_state(job_id, "RUNNING", "starting execution")
        self.audit.emit(job_id, spec.trace_id, "RUNNING", "starting execution")
        success = self._run_steps(job_id, spec)

        if success:
            self.store.append_state(job_id, "COMPLETED", "all steps succeeded")
            self.audit.emit(job_id, spec.trace_id, "COMPLETED", "job completed")
        else:
            self.store.append_state(job_id, "FAILED", "one or more steps failed")
            self.audit.emit(job_id, spec.trace_id, "FAILED", "job failed")
        return job_id

    def _run_steps(self, job_id: str, spec: JobSpec) -> bool:
        for step in spec.steps:
            attempts = step.retries + 1
            command_log: str = ""
            step_succeeded = False
            for attempt in range(1, attempts + 1):
                env = os.environ.copy()
                env["TRACE_ID"] = spec.trace_id
                try:
                    result = subprocess.run(
                        step.command,
                        shell=True,
                        capture_output=True,
                        text=True,
                        timeout=step.timeout_seconds,
                        env=env,
                    )
                    command_log += self._format_attempt_log(
                        spec.trace_id,
                        step.id,
                        attempt,
                        result.stdout,
                        result.stderr,
                        result.returncode,
                    )
                    if result.returncode == 0:
                        step_succeeded = True
                        break
                except subprocess.TimeoutExpired as exc:
                    command_log += self._format_attempt_log(
                        spec.trace_id,
                        step.id,
                        attempt,
                        exc.stdout or "",
                        exc.stderr or f"timeout after {step.timeout_seconds}s",
                        returncode=-1,
                    )
            self.store.write_step_log(job_id, step.id or f"step-{step.name}", command_log)
            if not step_succeeded:
                return False
        return True

    @staticmethod
    def _format_attempt_log(
        trace_id: str,
        step_id: str,
        attempt: int,
        stdout: str,
        stderr: str,
        returncode: int,
    ) -> str:
        lines = [
            f"[trace_id={trace_id} step={step_id} attempt={attempt} rc={returncode}]",
            stdout or "",
            stderr or "",
            "---",
        ]
        return "\n".join(line for line in lines if line is not None)

    @staticmethod
    def _read_job_file(path: Path) -> Dict[str, object]:
        content = path.read_text()
        if path.suffix in {".yaml", ".yml"}:
            try:
                import yaml  # type: ignore
            except Exception as exc:  # pragma: no cover - optional dependency
                raise RuntimeError("YAML support requires PyYAML; use JSON or install PyYAML") from exc
            return yaml.safe_load(content)
        return json.loads(content)
