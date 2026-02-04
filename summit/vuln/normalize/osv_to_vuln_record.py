import hashlib
from typing import Dict, Any
from summit.vuln.types import VulnRecord, Aliases, Affected, Severity, Reference, Provenance

def osv_to_vuln_record(osv_data: Dict[str, Any], evidence_id: str) -> VulnRecord:
    """Normalizes an OSV record into a Summit VulnRecord."""

    osv_id = osv_data["id"]

    # Deterministic record_id
    hash_input = f"osv:{osv_id}".encode("utf-8")
    record_hash = hashlib.sha256(hash_input).hexdigest()[:16]
    record_id = f"VULNREC-{record_hash}"

    # Aliases
    aliases = Aliases()
    aliases.osv.append(osv_id)
    for alias in osv_data.get("aliases", []):
        if alias.startswith("CVE-"):
            aliases.cve.append(alias)
        elif alias.startswith("GHSA-"):
            aliases.ghsa.append(alias)
        else:
            aliases.vendor.append(alias)

    # Affected
    affected_list = []
    for item in osv_data.get("affected", []):
        pkg = item.get("package", {})
        affected_list.append(Affected(
            package=pkg.get("name", "unknown"),
            ecosystem=pkg.get("ecosystem", "unknown"),
            versions=item.get("versions", [])
        ))

    # Severity
    severity_list = []
    for sev in osv_data.get("severity", []):
        severity_list.append(Severity(
            system=sev.get("type", "unknown"),
            score=sev.get("score", "unknown"),
            source="OSV"
        ))

    # References
    references = []
    for ref in osv_data.get("references", []):
        references.append(Reference(
            url=ref.get("url"),
            source=ref.get("type")
        ))

    # Provenance
    provenance = [Provenance(
        source_name="OSV",
        source_url=f"https://osv.dev/vulnerability/{osv_id}",
        retrieved_via="OSV_API_V1",
        evidence_id=evidence_id
    )]

    return VulnRecord(
        record_id=record_id,
        aliases=aliases,
        title=osv_data.get("summary"),
        summary=osv_data.get("summary"),
        details=osv_data.get("details"),
        affected=affected_list,
        severity=severity_list,
        references=references,
        provenance=provenance
    )
