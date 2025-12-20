import os
import sys
import unittest

# Add the project root to sys.path to allow absolute imports
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../"))
sys.path.insert(0, project_root)

from ops.admin_studio_api import (
    _FEATURE_FLAGS,
    get_connector_health,
    get_feature_flag_state,
    get_schema_registry_status,
    search_audit_logs,
    toggle_feature_flag,
    trigger_job_backfill,
    trigger_job_retry,
)
from ops.chaos_hooks import inject_broker_kill_hook, inject_pod_kill_hook, trigger_chaos_drill
from ops.cost_guard import apply_query_budget, get_archive_tier_cost_estimate, kill_slow_query
from ops.observability import (
    clear_recorded_prom_metrics,
    get_recorded_prom_metrics,
    get_slo_dashboard_url,
    init_otel_tracing,
    record_prom_metric,
)


class TestOpsStubs(unittest.TestCase):

    def setUp(self):
        # Reset feature flags to default state before each test
        _FEATURE_FLAGS.clear()
        _FEATURE_FLAGS["new_feature"] = False
        _FEATURE_FLAGS["experimental_ui"] = False
        clear_recorded_prom_metrics()

    def test_observability_stubs(self):
        init_otel_tracing()
        record_prom_metric("test_metric", 1.0, {"label": "value"})
        metrics = get_recorded_prom_metrics("test_metric")
        self.assertEqual(len(metrics), 1)
        self.assertEqual(metrics[0]["value"], 1.0)
        self.assertEqual(metrics[0]["labels"], {"label": "value"})
        self.assertIn("grafana", get_slo_dashboard_url("test_service"))

    def test_cost_guard_stubs(self):
        self.assertTrue(apply_query_budget("MATCH (n) RETURN n", 100.0))
        self.assertFalse(apply_query_budget("MATCH (n)-[r*100]-(m) RETURN n,r,m", 5.0))
        self.assertTrue(kill_slow_query("query123", 60))
        self.assertGreater(get_archive_tier_cost_estimate(100.0, "S3_Glacier"), 0)

    def test_chaos_hooks_stubs(self):
        inject_pod_kill_hook("pod-abc")
        inject_broker_kill_hook("broker-xyz")
        trigger_chaos_drill("network_latency", "service-a")

    def test_admin_studio_api_feature_flags(self):
        # Test initial state
        self.assertFalse(get_feature_flag_state("new_feature"))
        self.assertFalse(get_feature_flag_state("non_existent_flag"))

        # Test toggling existing flag
        self.assertTrue(toggle_feature_flag("new_feature", True))
        self.assertTrue(get_feature_flag_state("new_feature"))
        self.assertTrue(toggle_feature_flag("new_feature", False))
        self.assertFalse(get_feature_flag_state("new_feature"))

        # Test toggling non-existent flag
        self.assertFalse(toggle_feature_flag("non_existent_flag", True))

    def test_admin_studio_api_other_functions(self):
        status = get_schema_registry_status()
        self.assertIn("status", status)
        health = get_connector_health("connector-1")
        self.assertIn("status", health)
        self.assertTrue(trigger_job_retry("job-456"))
        self.assertTrue(trigger_job_backfill("job-789", "2023-01-01", "2023-01-02"))
        logs = search_audit_logs("user_login")
        self.assertIsInstance(logs, list)


if __name__ == "__main__":
    unittest.main()
