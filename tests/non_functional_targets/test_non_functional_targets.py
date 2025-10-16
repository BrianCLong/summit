import os
import sys
import unittest

# Add the project root to sys.path to allow absolute imports
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../"))
sys.path.insert(0, project_root)

from non_functional_targets.chaos_runner import (
    run_broker_kill_chaos_test,
    run_pod_kill_chaos_test,
    simulate_cross_region_failover,
    simulate_pitr_recovery,
)
from non_functional_targets.ingest_compliance import apply_data_minimization, apply_policy_labels
from non_functional_targets.slo_monitor import (
    check_graph_query_slo,
    check_ingestion_slo,
    generate_heatmap,
    generate_latency_histogram,
)


class TestNonFunctionalTargetsStubs(unittest.TestCase):

    def test_check_graph_query_slo(self):
        self.assertTrue(check_graph_query_slo(1000.0))
        self.assertFalse(check_graph_query_slo(2000.0))

    def test_check_ingestion_slo(self):
        self.assertTrue(check_ingestion_slo(4.0, 10000))
        self.assertFalse(check_ingestion_slo(6.0, 10000))
        self.assertFalse(check_ingestion_slo(4.0, 5000))

    def test_generate_latency_histogram(self):
        hist = generate_latency_histogram([100, 200, 1500])
        self.assertIn("bins", hist)
        self.assertIn("counts", hist)

    def test_generate_heatmap(self):
        heatmap = generate_heatmap([[1, 2], [3, 4]])
        self.assertIn("type", heatmap)
        self.assertIn("data", heatmap)

    def test_run_pod_kill_chaos_test(self):
        result = run_pod_kill_chaos_test(["pod-a", "pod-b"])
        self.assertIn("status", result)

    def test_run_broker_kill_chaos_test(self):
        result = run_broker_kill_chaos_test(["broker-1"])
        self.assertIn("status", result)

    def test_simulate_pitr_recovery(self):
        self.assertTrue(simulate_pitr_recovery("backup-123"))

    def test_simulate_cross_region_failover(self):
        self.assertTrue(simulate_cross_region_failover("us-east-1", "us-west-2"))

    def test_apply_data_minimization(self):
        raw_data = {"name": "John Doe", "email": "john@example.com", "age": 30}
        policy = {"redact_pii": True}
        minimized_data = apply_data_minimization(raw_data, policy)
        self.assertEqual(minimized_data["email"], "[REDACTED_EMAIL]")
        self.assertEqual(minimized_data["name"], "John Doe")

    def test_apply_policy_labels(self):
        data = {"content": "some text"}
        labels = ["sensitivity:low", "origin:external"]
        labeled_data = apply_policy_labels(data, labels)
        self.assertIn("policy_labels", labeled_data)
        self.assertEqual(labeled_data["policy_labels"], labels)


if __name__ == "__main__":
    unittest.main()
