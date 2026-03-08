from dataclasses import dataclass
from typing import Dict, List, Literal

Action = Literal["read", "write", "execute", "share"]

@dataclass(frozen=True)
class Record:
    record_id: str
    owner: str
    classification: str  # e.g. public|internal|confidential|restricted
    permissions: dict[str, list[Action]]  # principal -> allowed actions
    provenance: list[dict]
    payload_ref: str
