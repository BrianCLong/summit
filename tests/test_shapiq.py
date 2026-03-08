import numpy as np
import pytest

from summit.xai.shapiq.estimator import ShapIQEstimator
from summit.xai.shapiq.interactions import InteractionManager
from summit.xai.shapiq.pipeline import ShapIQPipeline, redact_pii


def test_estimator_determinism():
    estimator1 = ShapIQEstimator(None, seed=42)
    estimator2 = ShapIQEstimator(None, seed=42)
    instance = [1, 2, 3, 4]

    attr1 = estimator1.explain(instance)
    attr2 = estimator2.explain(instance)

    assert attr1 == attr2

def test_interaction_matrix_symmetry():
    manager = InteractionManager(seed=42)
    instance = [1, 2, 3, 4]
    matrix = manager.compute_interactions(instance)

    assert np.allclose(matrix, matrix.T)
    assert np.all(np.diag(matrix) == 0)

def test_pipeline():
    pipeline = ShapIQPipeline(None, seed=42, allowed_features=["age", "income"])
    instance = {"age": 30, "income": 50000, "ssn": "123-45-6789"}

    report, metrics, stamp, matrix = pipeline.run(instance, "model_1", "123")

    assert "version" in report
    assert "latency_ms" in metrics
    assert "evidence_id" in stamp
    assert matrix.shape == (2, 2)
    # The ssn should be blocked (deny by default feature filter)
    assert "ssn" not in report["attributions"]
    assert "age" in report["attributions"]

def test_pii_redaction():
    assert redact_pii("My SSN is 123-45-6789") == "My SSN is [REDACTED]"
    assert redact_pii("Contact me at user@example.com") == "Contact me at [REDACTED]"
