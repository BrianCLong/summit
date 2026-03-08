from .base import Engine, RunRequest, RunResult
from .evidence_helper import write_engine_evidence


class OrchestrationEngine:
    name = "orchestration_engine"

    def run(self, req: RunRequest) -> RunResult:
        run_id = req.payload.get("run_id", "default")
        workflow = req.payload.get("workflow", {"steps": []})
        steps = workflow.get("steps", [])

        executed_steps = []
        for step in steps:
            step_name = step.get("name", "Unnamed Step")
            # Simulate step execution
            executed_steps.append({
                "step": step_name,
                "status": "completed",
                "output": f"Output for {step_name}",
                "evidence_id": f"EVD-ENTRE-502318-STEP-{step_name.upper().replace(' ', '_')}"
            })

        summary = {
            "status": "Workflows orchestrated",
            "dry_run": req.mode == "dry_run",
            "executed_steps": executed_steps
        }
        metrics = {
            "steps_executed": len(executed_steps),
            "workflow_completion": 1.0 if executed_steps else 0.0
        }

        evidence_path = write_engine_evidence(self.name, run_id, summary, metrics)

        return RunResult(ok=True, evidence_path=evidence_path, summary=summary)
