import os
import json
import uuid
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from .schemas import SystemQualityReport, SystemQualityMetrics
from .metrics import calculate_defect_density, calculate_rework_rate, calculate_variance_score

class SystemsQualityEvaluator:
    def __init__(self):
        pass

    def run(self,
            repo_path: str,
            commit_range: str,
            agent_id: str,
            test_results: Dict[str, Any],
            previous_scores: Optional[List[float]] = None,
            escape_rate: float = 0.0) -> SystemQualityReport:

        failing_tests = test_results.get("failed", 0)

        defect_density = calculate_defect_density(repo_path, commit_range, failing_tests)
        rework_rate = calculate_rework_rate(repo_path, commit_range)
        variance_score = calculate_variance_score(previous_scores or [])

        metrics = SystemQualityMetrics(
            defect_density=defect_density,
            rework_rate=rework_rate,
            variance_score=variance_score,
            escape_rate=escape_rate
        )

        evidence_id = f"SYSQ-{uuid.uuid4().hex[:8].upper()}-v1"

        # Use UTC explicitly
        report = SystemQualityReport(
            evidence_id=evidence_id,
            timestamp=datetime.now(timezone.utc),
            agent_id=agent_id,
            repo_path=repo_path,
            commit_range=commit_range,
            metrics=metrics,
            summary=f"Systems Quality Evaluation for {agent_id}",
            environment="ci",
            backend="systems_quality_evaluator"
        )

        return report

    def save_report(self, report: SystemQualityReport, output_dir: str):
        os.makedirs(output_dir, exist_ok=True)
        report_path = os.path.join(output_dir, "report.json")
        with open(report_path, "w") as f:
            f.write(report.model_dump_json(indent=2))
        return report_path
