from __future__ import annotations
from dataclasses import dataclass
from typing import Any, Dict, Literal, Optional

OpType = Literal["UPSERT_NODE", "UPSERT_EDGE", "TOMBSTONE_NODE", "TOMBSTONE_EDGE"]

@dataclass(frozen=True)
class DeltaOp:
    op: OpType
    uid: Optional[str] = None
    edge_key: Optional[str] = None
    label: Optional[str] = None
    rel: Optional[str] = None
    src_uid: Optional[str] = None
    dst_uid: Optional[str] = None
    props: Optional[Dict[str, Any]] = None
    checksum: Optional[str] = None
    reason: Optional[str] = None
