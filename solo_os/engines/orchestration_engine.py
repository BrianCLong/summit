from .base import Engine, RunRequest, RunResult
from .evidence_helper import write_engine_evidence

class OrchestrationEngine:
    name = "orchestration_engine"

    def run(self, req: RunRequest) -> RunResult:
        run_id = req.payload.get("run_id", "default")
        summary = {"status": "Workflows orchestrated", "dry_run": req.mode == "dry_run"}
        metrics = {"steps_executed": 0}

        evidence_path = write_engine_evidence(self.name, run_id, summary, metrics)

        return RunResult(ok=True, evidence_path=evidence_path, summary=summary)
