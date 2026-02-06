import json
import os

from summit.vuln.normalize.osv_to_vuln_record import osv_to_vuln_record


def test_osv_normalization_fixture():
    fixture_path = os.path.join(os.path.dirname(__file__), "fixtures/osv/fixture.json")
    with open(fixture_path) as f:
        osv_data = json.load(f)

    evidence_id = "EVID-TEST-001"
    record = osv_to_vuln_record(osv_data, evidence_id)

    assert record.record_id.startswith("VULNREC-")
    assert "CVE-2023-32681" in record.aliases.cve
    assert record.aliases.osv == ["GHSA-7mh6-4q92-h499"]
    assert record.affected[0].package == "requests"
    assert record.provenance[0].evidence_id == evidence_id
    assert record.summary == "Improper Input Validation in requests"

def test_deterministic_id():
    osv_data = {"id": "SAME-ID", "affected": [], "severity": [], "references": []}
    evidence_id = "EVID-1"

    rec1 = osv_to_vuln_record(osv_data, evidence_id)
    rec2 = osv_to_vuln_record(osv_data, evidence_id)

    assert rec1.record_id == rec2.record_id
