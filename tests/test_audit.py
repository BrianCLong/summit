import json
import os
import shutil
import tempfile
import unittest
from pathlib import Path

from summit.governance.audit import AuditEvent, emit, redact


class TestAudit(unittest.TestCase):
    def test_redact(self):
        data = {
            "user": "jules",
            "password": "123",
            "nested": {
                "secret_token": "abc",
                "ok": "yes"
            }
        }
        redacted = redact(data)
        self.assertEqual(redacted["user"], "jules")
        self.assertEqual(redacted["password"], "[REDACTED]")
        self.assertEqual(redacted["nested"]["secret_token"], "[REDACTED]")
        self.assertEqual(redacted["nested"]["ok"], "yes")

    def test_emit(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            sink = os.path.join(tmpdir, "audit.jsonl")
            event = AuditEvent(
                event_type="test",
                actor="system",
                action="verify",
                decision="allow",
                metadata={"key": "val", "secret": "shh"}
            )
            emit(event, sink=sink)

            with open(sink) as f:
                line = f.readline()
                data = json.loads(line)
                self.assertEqual(data["event_type"], "test")
                self.assertEqual(data["metadata"]["secret"], "[REDACTED]")

if __name__ == "__main__":
    unittest.main()
