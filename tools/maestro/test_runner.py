import shutil
import tempfile
from pathlib import Path
from unittest import TestCase

from tools.maestro.model import JobSpec
from tools.maestro.policy import evaluate_policies
from tools.maestro.runner import JobRunner
from tools.maestro.store import StateStore
from tools.maestro.validator import validate_spec


class RunnerTests(TestCase):
    def setUp(self) -> None:
        self.tmpdir = Path(tempfile.mkdtemp())
        self.state_root = self.tmpdir / "state"
        self.audit_log = self.tmpdir / "audit.log"
        self.runner = JobRunner(self.state_root, self.audit_log)

    def tearDown(self) -> None:
        shutil.rmtree(self.tmpdir)

    def test_validation_and_policy_denial(self):
        spec = JobSpec.from_dict(
            {
                "name": "prod-denied",
                "owner": "ops@example.com",
                "environment": "prod",
                "required_policies": ["prod-requires-approval"],
                "steps": [{"name": "noop", "command": "echo nope"}],
            }
        )
        self.assertEqual([], validate_spec(spec))
        result = evaluate_policies(spec)
        self.assertFalse(result.allowed)
        job_id = self.runner.submit(spec)
        self.assertEqual("DENIED", self.runner.store.latest_state(job_id))

    def test_successful_run(self):
        spec = JobSpec.from_dict(
            {
                "name": "ok",
                "owner": "owner@example.com",
                "environment": "dev",
                "required_policies": ["owner-present", "no-destruction"],
                "trace_id": "trace-1234",
                "steps": [{"id": "echo", "name": "echo", "command": "echo ok"}],
            }
        )
        job_id = self.runner.submit(spec)
        events = self.runner.store.get_events(job_id)
        self.assertEqual(events[-1]["state"], "COMPLETED")
        logs = self.runner.store.read_all_logs(job_id)
        self.assertIn("echo.log", logs)
        self.assertIn("ok", logs["echo.log"])
        self.assertIn("trace-1234", logs["echo.log"])

    def test_step_log_sanitization(self):
        store = StateStore(self.state_root)
        log_path = store.write_step_log("job-1", "weird/step", "ok")
        self.assertEqual("weird_step.log", log_path.name)
