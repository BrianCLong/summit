from __future__ import annotations
from dataclasses import dataclass
from typing import List, Optional
from ..evidence.emit import emit

@dataclass(frozen=True)
class AppTemplate:
    name: str
    source_url: str
    digest: str
    is_privileged: bool = False

class MarketImporter:
    def __init__(self, allowlist: List[str]):
        self.allowlist = allowlist

    def import_template(self, template: AppTemplate) -> bool:
        notes = []
        status = "imported"

        # Provenance check
        is_allowed = any(template.source_url.startswith(domain) for domain in self.allowlist)
        if not is_allowed:
            status = "rejected"
            notes.append(f"Source URL {template.source_url} not in allowlist")

        if template.is_privileged:
            status = "rejected"
            notes.append("Privileged templates are blocked by default")

        # Emit evidence EVD-COSMOS-SERVER-MKT-001
        emit(
            evidence_index={
                "EVD-COSMOS-SERVER-MKT-001": ["evidence/cosmos-server/report.json", "evidence/cosmos-server/metrics.json"],
            },
            report={"status": status, "notes": notes},
            metrics={"counters": {"templates_processed": 1, "templates_rejected": 1 if status == "rejected" else 0}}
        )

        return status == "imported"
