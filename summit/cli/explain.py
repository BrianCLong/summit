import typer
from summit.kernel.intent.extractor import extract_intent
from summit.kernel.trust.maintainability import compute_metrics
from summit.llm.explain import build_explanation
from summit.artifacts.writer import write_explain_bundle
from summit.schemas.explanation import Intent, ExplainMetrics

app = typer.Typer()

@app.command()
def explain(path: str) -> None:
    intent_dict = extract_intent(path)
    intent = Intent.model_validate(intent_dict)

    metrics_dict = compute_metrics(path)
    metrics = ExplainMetrics.model_validate(metrics_dict)

    report = build_explanation(path=path, intent=intent, metrics=metrics)
    write_explain_bundle(path=path, report=report, metrics=metrics)

    print(f"Explanation completed for {path}. Artifacts written to artifacts/summit/explain/")
    print("\nReport Preview:")
    print(f"Component: {report.component}")
    print(f"Purpose: {report.purpose}")
    print(f"Dependencies: {', '.join(report.dependencies)}")
    print(f"Risks: {report.risks}")

if __name__ == "__main__":
    app()
