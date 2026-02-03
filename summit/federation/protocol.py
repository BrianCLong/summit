from dataclasses import dataclass
from enum import Enum
from typing import Any, Dict, List, Optional


class PrivacyMechanism(Enum):
    NONE = "NONE"
    DP = "DP"
    HE = "HE"
    OTHER = "OTHER"

@dataclass(frozen=True)
class ParticipantUpdate:
    participant_id: str
    round_id: str
    model_hash: str
    update_hash: str
    privacy_mechanism: PrivacyMechanism
    governance: dict[str, Any]
    metrics: dict[str, float]
    # Payload is intentionally excluded from the contract object for audit purposes
    # It would be handled by a separate transport layer

@dataclass(frozen=True)
class FederatedRound:
    round_id: str
    config: dict[str, Any]
    participants: list[str]
