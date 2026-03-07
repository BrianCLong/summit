from summit.schemas.explanation import ExplanationReport, Intent, ExplainMetrics
import os

def build_explanation(path: str, intent: Intent, metrics: ExplainMetrics) -> ExplanationReport:
    # Safely get basename of path
    file_name = os.path.basename(path)
    if not file_name:
        file_name = "unknown_module"

    risks = "Low risk."
    if metrics.cyclomatic_complexity > 15:
        risks = "High cyclomatic complexity indicates difficult maintainability and testing."
    elif metrics.function_count > 10:
        risks = "High number of functions might violate single-responsibility principle."

    purpose = f"Module {file_name} acts as a {intent.layer} layer providing {intent.component} features."

    return ExplanationReport(
        component=intent.component,
        purpose=purpose,
        dependencies=intent.dependencies,
        risks=risks,
        evidence_id="SUMMIT:INTENT:EXPLANATION:0001"
    )
