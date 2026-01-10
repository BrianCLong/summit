from __future__ import annotations

import tempfile
import unittest
from datetime import datetime, timedelta
from pathlib import Path

from ops.toil import (
    AlertMetadata,
    AlertRegistry,
    ChatOpsBot,
    DashboardBuilder,
    ExceptionEntry,
    ExceptionsRegistry,
    PolicyViolation,
    ReleaseEnvelope,
    ReleaseSafetyEnforcer,
    RemediationLibrary,
    ToilBudget,
    ToilDiary,
    ToilEntry,
)


class ToilSystemTest(unittest.TestCase):
    def setUp(self) -> None:
        self.tempdir = tempfile.TemporaryDirectory()
        base = Path(self.tempdir.name)
        self.diary = ToilDiary(base / "diary.json")
        self.alerts = AlertRegistry(base / "alerts.json")
        self.exceptions = ExceptionsRegistry(base / "exceptions.json")
        self.remediation = RemediationLibrary()
        self.chatops = ChatOpsBot(self.remediation)

    def tearDown(self) -> None:
        self.tempdir.cleanup()

    def test_toil_budget_and_top_drivers(self) -> None:
        now = datetime.utcnow()
        for idx in range(3):
            self.diary.add_entry(
                ToilEntry(
                    service="search",
                    team="sre",
                    person=f"dev{idx}",
                    category="noisy-alert",
                    minutes=200,
                    severity=2,
                    timestamp=now - timedelta(days=idx),
                    after_hours=True,
                    alert_source="search_latency",
                    mtta_minutes=3,
                    mttr_minutes=15,
                )
            )
        metrics = self.diary.on_call_load()
        self.assertGreater(metrics["pages_per_week"], 0)
        breaches = self.diary.budget_breaches(
            [ToilBudget(team="sre", max_hours_per_person=5, team_size=1)]
        )
        self.assertIn("sre", breaches)
        top = self.diary.rank_top_drivers(limit=1)[0]
        self.assertEqual(top[0], "search_latency")

    def test_alert_freeze_and_false_positive_guardrail(self) -> None:
        legacy = AlertMetadata(
            id="legacy",
            name="legacy_latency",
            severity="page",
            service="search",
            owner="pager",
            runbook="https://runbook",
            taxonomy="latency",
        )
        self.alerts.alerts["legacy"] = legacy
        alert = AlertMetadata(
            id="a1",
            name="p1_latency",
            severity="page",
            service="search",
            owner="pager",
            runbook="https://runbook",
            taxonomy="latency",
        )
        with self.assertRaises(PolicyViolation):
            self.alerts.add_alert(alert)
        alert.replace_alert_id = "legacy"
        alert.id = "a2"
        self.alerts.add_alert(alert)
        self.alerts.record_page("a2", duration_minutes=5)
        with self.assertRaises(PolicyViolation):
            self.alerts.record_page("a2", duration_minutes=5, false_positive=True)

    def test_exception_expiry_and_reminder(self) -> None:
        entry = ExceptionEntry(
            name="manual_fix",
            owner="ops",
            reason="legacy process",
            expires_at=datetime.utcnow() + timedelta(days=3),
        )
        self.exceptions.add(entry)
        self.assertEqual(len(self.exceptions.reminders()), 1)
        expired = self.exceptions.prune_expired(now=datetime.utcnow() + timedelta(days=4))
        self.assertEqual(len(expired), 1)
        self.assertEqual(len(self.exceptions.exceptions), 0)

    def test_chatops_rbac_and_remediation(self) -> None:
        result = self.chatops.run_command(
            "retry_job", user_role="sre", target="job123", dry_run=True
        )
        self.assertTrue(result.dry_run)
        with self.assertRaises(PolicyViolation):
            self.chatops.run_command("retry_job", user_role="guest", target="job123")

    def test_release_envelope_guardrails(self) -> None:
        envelope = ReleaseEnvelope(
            service="search",
            tier="tier0",
            version="1.2.3",
            canary_percentage=5,
            ramp_steps=3,
            rollback_plan="rollback to 1.2.2",
            verification_tests=["smoke", "slo"],
        )
        ReleaseSafetyEnforcer().validate(envelope)
        bad_envelope = ReleaseEnvelope(
            service="search",
            tier="tier0",
            version="1.2.3",
            canary_percentage=0,
            ramp_steps=1,
            rollback_plan="",
            verification_tests=[],
        )
        with self.assertRaises(PolicyViolation):
            ReleaseSafetyEnforcer().validate(bad_envelope)

    def test_dashboard_combines_metrics(self) -> None:
        now = datetime.utcnow()
        self.diary.add_entry(
            ToilEntry(
                service="search",
                team="sre",
                person="dev1",
                category="page",
                minutes=30,
                severity=1,
                timestamp=now,
                after_hours=False,
            )
        )
        legacy = AlertMetadata(
            id="legacy",
            name="legacy_page",
            severity="page",
            service="search",
            owner="pager",
            runbook="https://runbook",
            taxonomy="availability",
        )
        self.alerts.alerts["legacy"] = legacy
        new_alert = AlertMetadata(
            id="a1",
            name="p1",
            severity="page",
            service="search",
            owner="pager",
            runbook="https://runbook",
            taxonomy="availability",
            replace_alert_id="legacy",
        )
        self.alerts.add_alert(new_alert)
        self.alerts.record_page("a1", duration_minutes=5)
        self.exceptions.add(
            ExceptionEntry(
                name="manual_cleanup",
                owner="ops",
                reason="pending automation",
                expires_at=datetime.utcnow() + timedelta(days=1),
            )
        )
        dashboard = DashboardBuilder(self.diary, self.alerts, self.exceptions).build()
        self.assertIn("on_call_load", dashboard)
        self.assertIn("alert_costs", dashboard)
        self.assertIn("exceptions", dashboard)


if __name__ == "__main__":
    unittest.main()
