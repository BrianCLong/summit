import pandas as pd

from vsdf import (
    SchemaLearner,
    ConstraintSpecification,
    ConstraintCompiler,
    ConstraintDrivenSampler,
    ConstraintVerifier,
)


def build_reference_frame() -> pd.DataFrame:
    return pd.DataFrame(
        {
            "age": [25, 32, 40, 28, 36, 52, 47, 30, 45, 38],
            "income": [50000, 62000, 58000, 52000, 61000, 75000, 68000, 54000, 72000, 59000],
            "segment": ["A", "B", "A", "A", "B", "B", "A", "B", "A", "B"],
            "city": [
                "Denver",
                "Denver",
                "Boulder",
                "Denver",
                "Boulder",
                "Denver",
                "Boulder",
                "Denver",
                "Boulder",
                "Denver",
            ],
        }
    )


def test_vsdf_end_to_end_success():
    frame = build_reference_frame()
    schema = SchemaLearner().learn(frame)
    specification = ConstraintSpecification(
        marginal_columns=["segment", "city"],
        correlation_pairs=[("age", "income")],
        marginal_tolerance=0.1,
        correlation_tolerance=0.1,
        denial_predicates=["age < 21 and income > 60000"],
        denial_tolerance=0.0,
        dp_epsilon=8.0,
    )

    compiler = ConstraintCompiler(schema)
    constraints = compiler.learn(frame, specification)

    sampler = ConstraintDrivenSampler(schema, constraints, random_state=1234)
    synthetic = sampler.sample(256)

    verifier = ConstraintVerifier(constraints, privacy_threshold=0.1)
    report = verifier.verify(synthetic, frame)

    assert report.success, report.to_dict()
    assert report.privacy_risk <= 0.1
    assert report.marginal_distances["segment"] <= 0.1
    assert report.correlation_deltas[("age", "income")] <= 0.1
