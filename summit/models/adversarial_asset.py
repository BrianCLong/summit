from enum import Enum
from typing import List, Optional
from datetime import datetime, timezone
from pydantic import BaseModel, Field

def utc_now():
    return datetime.now(timezone.utc)

class EngagementState(str, Enum):
    UNKNOWN = "unknown"
    SUSPECTED = "suspected"
    CONFIRMED_ADVERSARIAL = "confirmed_adversarial"
    MONITORED = "monitored"
    TURNED = "turned"
    BURNED = "burned"

class InteractionType(str, Enum):
    CONTENT_DROP = "content_drop"
    AMPLIFICATION_SURGE = "amplification_surge"
    PROBING_ATTACK = "probing_attack"
    FAILED_PROBE = "failed_probe"

class InteractionEvent(BaseModel):
    event_id: str
    timestamp: datetime = Field(default_factory=utc_now)
    type: InteractionType
    description: str
    metadata: dict = Field(default_factory=dict)

class AdversarialAsset(BaseModel):
    asset_id: str
    asset_type: str  # e.g., account, campaign, outlet, botnet cluster, persona
    state: EngagementState = EngagementState.UNKNOWN
    history: List[InteractionEvent] = Field(default_factory=list)
    risk_score: float = 0.0
    tags: List[str] = Field(default_factory=list)
    justification: Optional[str] = None
    last_updated: datetime = Field(default_factory=utc_now)

    def transition_to(self, new_state: EngagementState, justification: str):
        """Transition the asset to a new engagement state with justification."""
        # Invariants
        if self.state == EngagementState.BURNED and new_state != EngagementState.BURNED:
            raise ValueError("Burned assets cannot be transitioned to other states.")

        if new_state == EngagementState.TURNED and self.state != EngagementState.MONITORED:
            raise ValueError("Only monitored assets can be turned.")

        self.state = new_state
        self.justification = justification
        self.last_updated = utc_now()

    def add_event(self, event: InteractionEvent):
        """Add an interaction event to the asset's history."""
        self.history.append(event)
        self.last_updated = utc_now()
