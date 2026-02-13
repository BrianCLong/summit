from typing import Any, Dict, List

from summit.vuln.types import VulnRecord


def compute_drift(records: list[VulnRecord], cve_known_ids: list[str]) -> dict[str, Any]:
    """Computes drift between ingested records and a known CVE list."""

    cve_known_set = set(cve_known_ids)

    missing_from_cve_cache = []
    has_cve_alias = 0
    total_records = len(records)

    for rec in records:
        if rec.aliases.cve:
            has_cve_alias += 1
            for cve in rec.aliases.cve:
                if cve not in cve_known_set:
                    missing_from_cve_cache.append({
                        "record_id": rec.record_id,
                        "cve_id": cve,
                        "osv_id": rec.aliases.osv[0] if rec.aliases.osv else None
                    })

    drift_score = len(missing_from_cve_cache) / total_records if total_records > 0 else 0

    return {
        "summary": {
            "total_records": total_records,
            "has_cve_alias": has_cve_alias,
            "missing_from_cve_cache_count": len(missing_from_cve_cache),
            "drift_score": drift_score
        },
        "details": {
            "missing_from_cve_cache": missing_from_cve_cache
        }
    }
