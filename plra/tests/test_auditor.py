"""Tests for the Pseudonym Linkage Risk Auditor."""

from __future__ import annotations

import json
import pathlib
import sys
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[2]))

from plra import PseudonymLinkageRiskAuditor, load_seeded_fixture


def test_detects_injected_high_risk_records():
    dataset = load_seeded_fixture()
    auditor = PseudonymLinkageRiskAuditor(quasi_identifiers=("region", "age_band", "profession"))
    report = auditor.analyze(dataset)

    tokens = {dataset[index]['token'] for index in report.high_risk_records}
    assert tokens == {'tok_high_1', 'tok_high_2', 'tok_high_3'}
    assert report.linkage_risk_score > 0.0
    assert report.linkage_simulation["bucket_distribution"]["high"] > 0


def test_mitigation_plan_reduces_risk_projection():
    dataset = load_seeded_fixture()
    auditor = PseudonymLinkageRiskAuditor(quasi_identifiers=("region", "age_band", "profession"))
    report = auditor.analyze(dataset)

    projected = report.mitigation_plan.projected_risk_score
    assert projected < report.linkage_risk_score
    assert projected < 0.05
    assert set(report.mitigation_plan.details) == {
        'after_region_generalise',
        'after_profession_generalise',
    }


def test_report_serialisation_is_deterministic():
    dataset = load_seeded_fixture()
    auditor = PseudonymLinkageRiskAuditor(quasi_identifiers=("region", "age_band", "profession"), seed=2024)

    first = auditor.analyze(dataset).to_json()
    second = auditor.analyze(dataset).to_json()
    assert first == second
    json.loads(first)  # ensure valid JSON
