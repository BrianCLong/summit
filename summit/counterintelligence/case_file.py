from enum import Enum
from datetime import datetime, timezone
from typing import List, Optional, Dict

class AssetStatus(Enum):
    UNKNOWN = "UNKNOWN"
    IDENTIFIED = "IDENTIFIED"
    SUSPECTED_ADVERSARIAL = "SUSPECTED_ADVERSARIAL"
    MONITORED_SENSOR = "MONITORED_SENSOR"
    TURNED_EARLY_WARNING = "TURNED_EARLY_WARNING"
    BURNED = "BURNED"

class LedgerEntry:
    def __init__(self, from_state: AssetStatus, to_state: AssetStatus, actor: str, rationale: str, context_id: str = None):
        self.timestamp = datetime.now(timezone.utc)
        self.from_state = from_state
        self.to_state = to_state
        self.actor = actor
        self.rationale = rationale
        self.context_id = context_id

    def to_dict(self):
        return {
            "timestamp": self.timestamp.isoformat(),
            "from_state": self.from_state.value,
            "to_state": self.to_state.value,
            "actor": self.actor,
            "rationale": self.rationale,
            "context_id": self.context_id
        }

class TurningLedger:
    def __init__(self):
        self._entries: List[LedgerEntry] = []
        self._current_state = AssetStatus.UNKNOWN

    @property
    def current_state(self) -> AssetStatus:
        return self._current_state

    @property
    def entries(self) -> List[LedgerEntry]:
        return list(self._entries)  # Return a copy to enforce append-only externally

    def _validate_transition(self, from_state: AssetStatus, to_state: AssetStatus) -> bool:
        if from_state == to_state:
            return False

        # Allowed transitions
        allowed = {
            AssetStatus.UNKNOWN: [AssetStatus.IDENTIFIED, AssetStatus.SUSPECTED_ADVERSARIAL],
            AssetStatus.IDENTIFIED: [AssetStatus.SUSPECTED_ADVERSARIAL, AssetStatus.BURNED],
            AssetStatus.SUSPECTED_ADVERSARIAL: [AssetStatus.MONITORED_SENSOR, AssetStatus.BURNED, AssetStatus.IDENTIFIED],
            AssetStatus.MONITORED_SENSOR: [AssetStatus.TURNED_EARLY_WARNING, AssetStatus.BURNED, AssetStatus.SUSPECTED_ADVERSARIAL],
            AssetStatus.TURNED_EARLY_WARNING: [AssetStatus.BURNED, AssetStatus.MONITORED_SENSOR],
            AssetStatus.BURNED: [] # Terminal state
        }

        return to_state in allowed.get(from_state, [])

    def append(self, to_state: AssetStatus, actor: str, rationale: str, context_id: str = None) -> bool:
        if not self._validate_transition(self._current_state, to_state):
            raise ValueError(f"Illegal state transition from {self._current_state.value} to {to_state.value}")

        entry = LedgerEntry(
            from_state=self._current_state,
            to_state=to_state,
            actor=actor,
            rationale=rationale,
            context_id=context_id
        )
        self._entries.append(entry)
        self._current_state = to_state
        return True

class CounterintelligenceCaseFile:
    def __init__(self, case_id: str, asset_ids: List[str]):
        self.case_id = case_id
        self.asset_ids = asset_ids

        # Defensive Analysis Descriptors
        self.access = "" # What the asset can "see" in narrative space
        self.motivation = ""
        self.vulnerability = ""
        self.intelligence_value = "" # Unique early warning/SA this provides

        # Security constraints
        self.operational_constraints = "DEFENSIVE ANALYSIS ONLY. DO NOT ENGAGE. DO NOT TASK."

        # Turning Ledger
        self.ledger = TurningLedger()

    def update_analysis(self, access: str = None, motivation: str = None, vulnerability: str = None, intelligence_value: str = None):
        if access is not None: self.access = access
        if motivation is not None: self.motivation = motivation
        if vulnerability is not None: self.vulnerability = vulnerability
        if intelligence_value is not None: self.intelligence_value = intelligence_value

    def to_dict(self):
        return {
            "case_id": self.case_id,
            "asset_ids": self.asset_ids,
            "access": self.access,
            "motivation": self.motivation,
            "vulnerability": self.vulnerability,
            "intelligence_value": self.intelligence_value,
            "operational_constraints": self.operational_constraints,
            "state": self.ledger.current_state.value,
            "ledger_history": [e.to_dict() for e in self.ledger.entries]
        }
