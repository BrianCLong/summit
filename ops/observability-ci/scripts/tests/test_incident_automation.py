import importlib.util
import json
import sys
import tempfile
import textwrap
from pathlib import Path
import unittest

import yaml


def load_module(module_path: Path, name: str):
    spec = importlib.util.spec_from_file_location(name, module_path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Unable to load module {name} from {module_path}")

    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


generate = load_module(
    Path(__file__).resolve().parents[1] / "generate_alert_runbooks.py",
    "generate_alert_runbooks",
)
validate = load_module(
    Path(__file__).resolve().parents[1] / "validate_oncall_and_pagerduty.py",
    "validate_oncall_and_pagerduty",
)


class GenerateAlertRunbooksTest(unittest.TestCase):
    def test_generates_sorted_payloads_and_runbook(self) -> None:
        with tempfile.TemporaryDirectory() as tmpdir:
            alerts_path = Path(tmpdir) / "alerts.yml"
            alerts_path.write_text(
                textwrap.dedent(
                    """
                    groups:
                      - name: service-alerts
                        rules:
                          - alert: ZetaAlert
                            expr: rate(errors_total[5m]) > 0.1
                            labels:
                              severity: page
                            annotations:
                              summary: High zeta errors
                          - alert: AlphaAlert
                            expr: rate(requests_total[5m]) > 10
                            labels:
                              severity: warn
                            annotations:
                              summary: Elevated traffic
                    """
                ).strip()
                + "\n"
            )

            alerts = generate.load_alerts(alerts_path)
            generate.validate_alerts(alerts)
            alerts_sorted = sorted(alerts, key=lambda a: a.name)

            payload_dir = Path(tmpdir) / "payloads"
            generate.write_alert_payloads(alerts_sorted, payload_dir)

            # introduce an unexpected file to ensure cleanup works
            extra_file = payload_dir / "Unexpected.json"
            extra_file.write_text("{}\n")
            generate.write_alert_payloads(alerts_sorted, payload_dir)

            generate.ensure_payloads_current(alerts_sorted, payload_dir)

            alpha_payload = json.loads((payload_dir / "AlphaAlert.json").read_text())
            self.assertEqual(alpha_payload["alert_name"], "AlphaAlert")
            self.assertEqual(alpha_payload["severity"], "warn")

            runbook = generate.build_runbook(alerts_sorted)
            self.assertIn("## Alert: AlphaAlert", runbook)
            self.assertIn("## Alert: ZetaAlert", runbook)


class ValidateOncallAndPagerDutyTest(unittest.TestCase):
    def test_validates_rotation_and_pagerduty_contracts(self) -> None:
        rotation = {
            "primary": {
                "schedule": "sre-primary",
                "escalation_policy": "sre-ml-primary",
                "paging_channel": "#primary",
                "shift_length": "1w",
            },
            "secondary": {
                "schedule": "sre-secondary",
                "escalation_policy": "sre-ml-primary",
                "paging_channel": "#secondary",
                "shift_length": "1w",
            },
        }
        rotation_errors = validate.validate_rotation(rotation)
        self.assertEqual(rotation_errors, [])

        pd_service = {
            "metadata": {"name": "intelgraph-ml-observability"},
            "spec": {
                "escalation_policy": "sre-ml-primary",
                "incident_urgency_rules": {"during_support_hours": {"type": "constant"}},
                "integrations": [
                    {
                        "name": "Prometheus Alertmanager",
                        "type": "events-api-v2",
                        "routing_key_secret": "PAGERDUTY_ML_ROUTING_KEY",
                    }
                ],
            },
        }
        pd_errors = validate.validate_pagerduty_service(
            pd_service, "sre-ml-primary", "intelgraph-ml-observability"
        )
        self.assertEqual(pd_errors, [])

        # Missing service_key should be flagged
        notification = {
            "receivers": [
                {
                    "name": "oncall-page",
                    "pagerduty_configs": [{"foo": "bar"}],
                }
            ],
            "route": {"routes": [{"match": {"severity": "critical"}, "receiver": "oncall-page"}]},
        }
        route_errors = validate.validate_notification_routes(
            {"data": {"notification_channels.yaml": yaml.safe_dump(notification)}}
        )
        self.assertIn("service_key", " ".join(route_errors))


if __name__ == "__main__":
    unittest.main()
