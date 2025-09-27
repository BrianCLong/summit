"""Unit tests for the OPLD analysis pipeline."""

from __future__ import annotations

import json
from pathlib import Path
import tempfile
import unittest

from tools.opld.analysis import LogEntry, compare_runs, load_log
from tools.opld.detectors import DetectorPipeline


class TestLoadLog(unittest.TestCase):
    def test_loads_json_array(self) -> None:
        with tempfile.TemporaryDirectory() as tmpdir:
            path = Path(tmpdir) / "log.json"
            path.write_text(
                json.dumps(
                    [
                        {"prompt_id": "p1", "response": "Contact me at alex@example.com"},
                        {"id": "2", "completion": "Call 555-123-4567"},
                    ]
                )
            )
            entries = load_log(path)
            self.assertEqual(len(entries), 2)
            self.assertEqual(entries[0].prompt_id, "p1")
            self.assertEqual(entries[1].response, "Call 555-123-4567")

    def test_loads_json_lines(self) -> None:
        with tempfile.TemporaryDirectory() as tmpdir:
            path = Path(tmpdir) / "log.jsonl"
            path.write_text(
                "\n".join(
                    [
                        json.dumps({"prompt_id": "p1", "response": "hello"}),
                        json.dumps({"prompt_id": "p2", "response": "555-123-4567"}),
                    ]
                )
            )
            entries = load_log(path)
            self.assertEqual(len(entries), 2)
            self.assertEqual(entries[1].response, "555-123-4567")


class TestCompareRuns(unittest.TestCase):
    def setUp(self) -> None:
        self.pipeline = DetectorPipeline()

    def test_detects_regressions(self) -> None:
        baseline = [
            LogEntry(prompt_id="p1", response="The contact email is support@example.com."),
        ]
        candidate = [
            LogEntry(prompt_id="p1", response="Reach Alex Johnson at alex.johnson@example.com or 415-555-8910."),
            LogEntry(prompt_id="p2", response="Passport number AB1234567 should stay private."),
        ]
        report = compare_runs(baseline, candidate, pipeline=self.pipeline, threshold=0.2)
        self.assertEqual(report.summary["baseline_total"], 1)
        self.assertEqual(report.summary["candidate_total"], 3)
        self.assertEqual(report.summary["ci_gate"], "fail")
        regression_entities = [item for item in report.per_entity if item.status == "regression"]
        self.assertTrue(any(item.entity_type == "passport_number" for item in regression_entities))

    def test_improvements_lower_score(self) -> None:
        baseline = [
            LogEntry(prompt_id="p1", response="Call me at 202-555-1111"),
            LogEntry(prompt_id="p2", response="Social security 123-45-6789"),
        ]
        candidate = [
            LogEntry(prompt_id="p1", response="No personal info here."),
        ]
        report = compare_runs(baseline, candidate, pipeline=self.pipeline, threshold=0.5)
        self.assertEqual(report.summary["candidate_total"], 0)
        self.assertEqual(report.summary["ci_gate"], "pass")
        improvements = [item for item in report.per_entity if item.status == "improvement"]
        self.assertTrue(any(item.entity_type == "ssn" for item in improvements))


if __name__ == "__main__":
    unittest.main()
