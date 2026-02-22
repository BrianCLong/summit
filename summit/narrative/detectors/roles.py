from dataclasses import dataclass, field
from typing import Dict, Literal, Optional, List
from summit.narrative.events import DetectorEvent
import hashlib

@dataclass
class RoleProfile:
    actor_id: str
    # Historical counts
    originator_count: int = 0
    amplifier_count: int = 0
    critic_count: int = 0
    defender_count: int = 0

    def update(self, action_type: Literal["originate", "amplify"], stance: Literal["critic", "defender"]):
        if action_type == "originate":
            self.originator_count += 1
        else:
            self.amplifier_count += 1

        if stance == "critic":
            self.critic_count += 1
        else:
            self.defender_count += 1

    @property
    def primary_role(self) -> str:
        if self.originator_count > self.amplifier_count * 2:
            return "originator"
        if self.amplifier_count > self.originator_count * 2:
            return "amplifier"
        return "mixed"

    @property
    def primary_stance(self) -> str:
        if self.critic_count > self.defender_count * 2:
            return "critic"
        if self.defender_count > self.critic_count * 2:
            return "defender"
        return "mixed"

class RoleInversionDetector:
    def __init__(self, profiles: Dict[str, RoleProfile], threshold: float = 0.8):
        self.profiles = profiles
        self.threshold = threshold

    def detect(self, actor_id: str, action_type: Literal["originate", "amplify"], stance: Literal["critic", "defender"], event_window: Dict[str, str], evidence_ids: List[str]) -> Optional[DetectorEvent]:
        profile = self.profiles.get(actor_id)
        if not profile:
            return None

        # Check for role inversion
        is_inversion = False
        score = 0.0

        # 1. Amplification vs Origination inversion
        # If someone who historically only amplifies suddenly originates content
        if action_type == "originate" and profile.primary_role == "amplifier":
            is_inversion = True
            score += 0.5

        # 2. Stance inversion
        if stance == "critic" and profile.primary_stance == "defender":
            is_inversion = True
            score += 0.5
        elif stance == "defender" and profile.primary_stance == "critic":
            is_inversion = True
            score += 0.5

        if is_inversion and score >= self.threshold:
            # Deterministic ID based on actor, window, and type
            payload = f"{actor_id}|{action_type}|{stance}|{event_window.get('start')}"
            event_id = hashlib.sha256(payload.encode("utf-8")).hexdigest()[:16]

            return DetectorEvent(
                event_id=event_id,
                detector="role_inversion",
                score=score,
                threshold=self.threshold,
                window=event_window,
                evidence_ids=evidence_ids,
                metadata={
                    "actor_id": actor_id,
                    "historical_role": profile.primary_role,
                    "historical_stance": profile.primary_stance,
                    "current_action": action_type,
                    "current_stance": stance
                }
            )
        return None
