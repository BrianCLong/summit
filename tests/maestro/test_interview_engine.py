from __future__ import annotations

import unittest

from agents.maestro.interview_engine import REQUIRED_SECTIONS, build_spec_bundle


def sample_payload() -> dict:
    return {
        "spec_version": "1.0",
        "mode": "standard",
        "title": "Maestro Spec Interview",
        "scope": "Deterministic spec generation for Summit",
        "section_summaries": {
            "functional_requirements": "Capture and normalize requirements.",
            "non_functional_requirements": "Deterministic and stable outputs.",
            "data_model": "Emit schema-compliant JSON artifacts.",
            "agent_design": "Create Jules and Codex seeds.",
            "interfaces": "Expose CLI and artifact contract.",
            "risk_analysis": "Detect ambiguous and conflicting statements.",
            "acceptance_criteria": "All required sections and IDs are present.",
        },
        "functional_requirements": [
            "The engine must emit a spec bundle.",
            "The engine must not emit timestamps in report artifacts.",
        ],
        "non_functional_requirements": [
            "Output ordering must be deterministic.",
            "Performance should stay below approximately 5 seconds.",
        ],
        "data_model": ["The bundle must include requirement IDs and section names."],
        "agent_design": ["The workflow must provide Jules and Codex planning seeds."],
        "interfaces": ["A CLI must accept input JSON and write artifacts."],
        "risk_analysis": ["Unknown access constraints are pending governance confirmation."],
        "acceptance_criteria": [
            "All requirements have IDs.",
            "All sections are present.",
            "Open questions are captured.",
        ],
    }


class InterviewEngineTest(unittest.TestCase):
    def test_bundle_contains_required_sections_and_ids(self) -> None:
        bundle = build_spec_bundle(sample_payload())

        for section in REQUIRED_SECTIONS:
            self.assertIn(section, bundle)
            self.assertIsInstance(bundle[section], list)
            self.assertTrue(bundle[section])

        self.assertTrue(bundle["requirement_index"])
        self.assertTrue(
            all(item["id"].startswith("REQ-") for item in bundle["requirement_index"])
        )
        self.assertTrue(bundle["jules_tasks"])
        self.assertTrue(bundle["codex_tasks"])
        self.assertIsInstance(bundle["open_questions"], list)

    def test_bundle_is_deterministic_for_identical_input(self) -> None:
        payload = sample_payload()
        first = build_spec_bundle(payload)
        second = build_spec_bundle(payload)

        self.assertEqual(first, second)

    def test_contradictions_are_detected(self) -> None:
        payload = sample_payload()
        payload["functional_requirements"] = [
            "The system must encrypt data in transit.",
            "The system must not encrypt data in transit.",
        ]

        bundle = build_spec_bundle(payload)
        contradictions = bundle["diagnostics"]["contradictions"]

        self.assertTrue(contradictions)
        self.assertEqual(contradictions[0]["type"], "subject_polarity_conflict")


if __name__ == "__main__":
    unittest.main()
