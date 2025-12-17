from datetime import datetime
from datetime import datetime
from typing import Any


class AuditService:
    def __init__(self):
        self.entries: list[dict[str, Any]] = []

    def log(
        self,
        actor: str,
        action: str,
        tenant_id: str,
        case_id: str,
        target_ids: list[str],
        policy: dict[str, Any],
    ) -> None:
        self.entries.append(
            {
                "actor": actor,
                "action": action,
                "tenant_id": tenant_id,
                "case_id": case_id,
                "target_ids": target_ids,
                "policy": policy,
                "timestamp": datetime.utcnow().isoformat(),
            }
        )

    def get_logs(self, tenant_id: str, case_id: str, limit: int = 100) -> list[dict[str, Any]]:
        rows = [e for e in self.entries if e["tenant_id"] == tenant_id and e["case_id"] == case_id]
        return rows[-limit:]


audit_service = AuditService()
