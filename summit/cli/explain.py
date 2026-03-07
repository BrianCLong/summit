import typer
import os
from summit.kernel.intent.extractor import extract_intent
from summit.kernel.trust.maintainability import compute_metrics
from summit.llm.explain import build_explanation
from summit.artifacts.writer import write_explain_bundle
from summit.schemas.explanation import Intent, ExplainMetrics

app = typer.Typer()

@app.command()
def explain(path: str) -> None:
    # Security: Ensure path is within the allowed workspace
    abs_path = os.path.abspath(path)
    workspace_root = os.path.abspath(os.getcwd())

    if not abs_path.startswith(workspace_root):
        print(f"Error: Access denied. Path {abs_path} is outside of workspace.")
        raise typer.Exit(code=1)

    if not os.path.isfile(abs_path):
        print(f"Error: File not found: {abs_path}")
        raise typer.Exit(code=1)

    intent_dict = extract_intent(abs_path)
    intent = Intent.model_validate(intent_dict)

    metrics_dict = compute_metrics(abs_path)
    metrics = ExplainMetrics.model_validate(metrics_dict)

    report = build_explanation(path=abs_path, intent=intent, metrics=metrics)
    write_explain_bundle(path=abs_path, report=report, metrics=metrics)

    print(f"Explanation completed for {abs_path}. Artifacts written to artifacts/summit/explain/")
    print("\nReport Preview:")
    print(f"Component: {report.component}")
    print(f"Purpose: {report.purpose}")
    print(f"Dependencies: {', '.join(report.dependencies)}")
    print(f"Risks: {report.risks}")

if __name__ == "__main__":
    app()
