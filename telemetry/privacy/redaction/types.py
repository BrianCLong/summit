from dataclasses import dataclass
from enum import Enum
from typing import Any, Dict


class Classification(str, Enum):
    PUBLIC = "PUBLIC"
    INTERNAL = "INTERNAL"
    PSEUDONYMIZED = "PSEUDONYMIZED"
    SENSITIVE = "SENSITIVE"
    RESTRICTED_PII = "RESTRICTED_PII"


class Transform(str, Enum):
    ALLOW = "ALLOW"
    DROP = "DROP"
    MASK = "MASK"
    PSEUDONYMIZE = "PSEUDONYMIZE"
    HASH_STRUCTURED = "HASH_STRUCTURED"
    NOISE_TIME = "NOISE_TIME"
    DP_AGG_ONLY = "DP_AGG_ONLY"


class Linkability(str, Enum):
    NONE = "NONE"
    INTRA_DOMAIN = "INTRA_DOMAIN"
    CROSS_DOMAIN = "CROSS_DOMAIN"


@dataclass(frozen=True)
class FieldPolicy:
    classification: Classification
    transform: Transform
    linkability: Linkability = Linkability.NONE
    never_log: bool = False


TelemetryEvent = dict[str, Any]
