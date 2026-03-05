import json
import os

import numpy as np
import pytest

from .engine import ShapIQEngine
from .interactions import InteractionMatrix
from .report import generate_metrics, generate_report, generate_stamp


def test_engine_determinism():
    engine1 = ShapIQEngine(model=None, seed=42)
    importance1 = engine1.compute_feature_importance(None, ["f1", "f2"])

    engine2 = ShapIQEngine(model=None, seed=42)
    importance2 = engine2.compute_feature_importance(None, ["f1", "f2"])

    assert importance1 == importance2

def test_interaction_matrix_symmetry():
    mat = InteractionMatrix.compute(None, None, 5, seed=42)
    assert mat.is_symmetric()
    assert np.all(np.diag(mat.matrix) == 1.0)

def test_interaction_matrix_determinism():
    mat1 = InteractionMatrix.compute(None, None, 5, seed=42)
    mat2 = InteractionMatrix.compute(None, None, 5, seed=42)

    assert np.allclose(mat1.matrix, mat2.matrix)

def test_report_generation(tmp_path):
    engine = ShapIQEngine(model=None, seed=42)
    importance = engine.compute_feature_importance(None, ["f1", "f2"])
    mat = InteractionMatrix.compute(None, None, 2, seed=42)

    report = generate_report("EVD-TEST-001", importance, mat.to_list(), str(tmp_path))
    assert os.path.exists(tmp_path / "report.json")

    with open(tmp_path / "report.json") as f:
        data = json.load(f)
        assert data["evidence_id"] == "EVD-TEST-001"
        assert len(data["feature_importance"]) == 2
        assert len(data["interaction_matrix"]) == 2

def test_stamp_determinism(tmp_path):
    report_data = {"evidence_id": "EVD-TEST", "feature_importance": []}

    stamp1 = generate_stamp("EVD-TEST", report_data, str(tmp_path))
    hash1 = stamp1["tool_versions"]["hash"]

    stamp2 = generate_stamp("EVD-TEST", report_data, str(tmp_path))
    hash2 = stamp2["tool_versions"]["hash"]

    assert hash1 == hash2
