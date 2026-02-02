from dataclasses import dataclass
from typing import Dict, List, Literal

Action = Literal["read", "write", "execute", "share"]

@dataclass(frozen=True)
class Record:
    record_id: str
    owner: str
    classification: str  # e.g. public|internal|confidential|restricted
    permissions: Dict[str, List[Action]]  # principal -> allowed actions
    provenance: List[dict]
    payload_ref: str
