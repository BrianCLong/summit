from summit.vuln.drift.compute_drift import compute_drift
from summit.vuln.types import Aliases, VulnRecord


def test_compute_drift():
    # Record with known CVE
    rec1 = VulnRecord(
        record_id="V1",
        aliases=Aliases(cve=["CVE-1"]),
        provenance=[{"source_name": "S1", "evidence_id": "E1"}]
    )
    # Record with unknown CVE
    rec2 = VulnRecord(
        record_id="V2",
        aliases=Aliases(cve=["CVE-2"]),
        provenance=[{"source_name": "S2", "evidence_id": "E2"}]
    )
    # Record with no CVE
    rec3 = VulnRecord(
        record_id="V3",
        aliases=Aliases(osv=["OSV-3"]),
        provenance=[{"source_name": "S3", "evidence_id": "E3"}]
    )

    known_cves = ["CVE-1"]

    report = compute_drift([rec1, rec2, rec3], known_cves)

    assert report["summary"]["total_records"] == 3
    assert report["summary"]["missing_from_cve_cache_count"] == 1
    assert report["details"]["missing_from_cve_cache"][0]["cve_id"] == "CVE-2"
