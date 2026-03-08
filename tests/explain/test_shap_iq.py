import hashlib
import json
import tempfile
import unittest
from pathlib import Path

from explain.shap_iq import ExplainConfig, explain, write_artifacts
from explain.shap_iq.interactions import assert_symmetric


class ShapIQTests(unittest.TestCase):
    def setUp(self):
        self.model_id = "demo-model"
        self.feature_names = ["f1", "f2", "f3"]
        self.coefficients = [0.5, -0.2, 1.1]
        self.rows = [[0.2, 1.1, 0.0], [0.1, 0.4, 0.3], [0.4, 0.7, 0.2]]

    def test_deterministic_replay_hash(self):
        first = explain(self.model_id, self.feature_names, self.rows, self.coefficients, config=ExplainConfig(seed=7))
        second = explain(self.model_id, self.feature_names, self.rows, self.coefficients, config=ExplainConfig(seed=7))

        self.assertEqual(first.evidence_id, second.evidence_id)
        self.assertEqual(first.feature_importance, second.feature_importance)
        self.assertEqual(first.interaction_matrix, second.interaction_matrix)

    def test_artifact_emission_and_stamp(self):
        result = explain(self.model_id, self.feature_names, self.rows, self.coefficients)
        with tempfile.TemporaryDirectory() as tmp:
            report_path, metrics_path, stamp_path = write_artifacts(tmp, self.model_id, self.feature_names, result)
            report = json.loads(Path(report_path).read_text())
            metrics = json.loads(Path(metrics_path).read_text())
            stamp = json.loads(Path(stamp_path).read_text())

            self.assertIn("interaction_matrix", report)
            self.assertIn("mean_abs_shap", metrics)
            self.assertIn("interaction_strength_mean", metrics)

            canonical = Path(report_path).read_text() + Path(metrics_path).read_text()
            self.assertEqual(stamp["artifact_sha256"], hashlib.sha256(canonical.encode("utf-8")).hexdigest())

    def test_interaction_matrix_is_symmetric(self):
        result = explain(self.model_id, self.feature_names, self.rows, self.coefficients)
        assert_symmetric(result.interaction_matrix)


if __name__ == "__main__":
    unittest.main()
