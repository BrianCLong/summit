import json
import os
from typing import Any, Dict, Callable
from pathlib import Path

class EvalRunner:
    def __init__(self, evidence_dir: Path):
        self.evidence_dir = evidence_dir

    def run_fixture(self, name: str, fn: Callable[[], Dict[str, Any]]):
        # Run the fixture
        try:
            result = fn()
            status = "pass"
        except Exception as e:
            result = {"error": str(e)}
            status = "fail"

        # Emit evidence (simplified for this stub)
        report_path = self.evidence_dir / "report.json"
        if report_path.exists():
            with open(report_path) as f:
                report = json.load(f)
        else:
            report = {
                "evidence_id": "EVD-AGENTKIT-EVAL-001",
                "summary": "AgentKit Evaluation Run",
                "steps": [],
                "artifacts": {}
            }

        report.setdefault("steps", []).append({
            "name": name,
            "status": status,
            "details": result
        })

        with open(report_path, "w") as f:
            json.dump(report, f, indent=2)
