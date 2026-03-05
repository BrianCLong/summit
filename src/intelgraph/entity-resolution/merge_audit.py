import time
from dataclasses import dataclass


@dataclass
class MergeAuditRecord:
    canonical_id: str
    merged_ids: list[str]
    timestamp: float
    operator: str
    reason: str

class MergeAuditLogger:
    def __init__(self):
        self._records: list[MergeAuditRecord] = []

    def log_merge(self, canonical_id: str, merged_ids: list[str], operator: str, reason: str) -> None:
        record = MergeAuditRecord(
            canonical_id=canonical_id,
            merged_ids=merged_ids,
            timestamp=time.time(),
            operator=operator,
            reason=reason
        )
        self._records.append(record)
        print(f"Logged merge of {merged_ids} into {canonical_id} by {operator}")
