import json
import os
import unittest

from summit.workflow.base import WorkflowValidator


class TestWorkflowValidator(unittest.TestCase):
    def setUp(self):
        self.validator = WorkflowValidator(run_id="test-run-123456789012")
        self.test_path = "/tmp/test-project"

    def test_validate_dbt(self):
        report = self.validator.validate(self.test_path, "dbt")
        self.assertEqual(report["status"], "validated")
        self.assertEqual(report["adapter"], "dbt")
        self.assertTrue(report["evidence_id"].startswith("WF-DBT-"))

        # Check artifacts
        self.assertTrue(os.path.exists("artifacts/workflow/report.json"))
        self.assertTrue(os.path.exists("artifacts/workflow/metrics.json"))
        self.assertTrue(os.path.exists("artifacts/workflow/stamp.json"))

    def test_validate_airflow(self):
        report = self.validator.validate(self.test_path, "airflow")
        self.assertEqual(report["adapter"], "airflow")
        self.assertTrue(report["evidence_id"].startswith("WF-AIRFLOW-"))

if __name__ == '__main__':
    unittest.main()
