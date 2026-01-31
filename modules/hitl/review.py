from dataclasses import dataclass
from typing import Literal, Optional

Status = Literal["DRAFT","IN_REVIEW","APPROVED","REJECTED"]

@dataclass(frozen=True)
class ReviewRecord:
    pack_id: str
    status: Status
    reviewer: Optional[str]  # internal user id, not email
    rationale: Optional[str]
