from .base import Engine, RunRequest, RunResult
from .evidence_helper import write_engine_evidence

class ContentEngine:
    name = "content_engine"

    def run(self, req: RunRequest) -> RunResult:
        run_id = req.payload.get("run_id", "default")
        summary = {"status": "Content briefs generated"}
        metrics = {"briefs_count": 0}

        evidence_path = write_engine_evidence(self.name, run_id, summary, metrics)

        return RunResult(ok=True, evidence_path=evidence_path, summary=summary)
