from pathlib import Path

from impl.scaling.cli import main
from impl.scaling.ingest import ingest
from impl.scaling.modeling import fit_linear_response_surface, fit_power_law
from impl.scaling.planner import plan


FIXTURE = Path("impl/scaling/sample_runs.jsonl")
SCHEMA = Path("impl/scaling/schemas/experiment.schema.json")


def test_ingest_parses_experiments():
    experiments = ingest(FIXTURE, SCHEMA)
    assert len(experiments) == 3
    assert experiments[0].config.model_family == "dense"
    assert experiments[0].metrics.reasoning_score == 41.0


def test_scaling_and_planning_flow(capsys):
    experiments = ingest(FIXTURE, SCHEMA)
    scaling_fit = fit_power_law(experiments)
    surface = fit_linear_response_surface(experiments, metric="reasoning_score")

    recommendation = plan(
        base_configs=[exp.config for exp in experiments],
        scaling_fit=scaling_fit,
        response_surface=surface,
        objective="reasoning_score",
        constraints={"max_context": 16_384},
    )

    assert recommendation.config.context_length in {4096, 8192, 16384}
    assert recommendation.expected_utility > 0

    # smoke-test CLI invocation
    main([
        "--experiments",
        str(FIXTURE),
        "--schema",
        str(SCHEMA),
        "--objective",
        "reasoning_score",
    ])
    captured = capsys.readouterr()
    assert "Recommended configuration" in captured.out
