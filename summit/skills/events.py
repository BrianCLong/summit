from dataclasses import dataclass
from datetime import datetime
from typing import Any

@dataclass
class SkillEvent:
    timestamp: datetime
    event_type: str
    skill_id: str
    user_id: str
    details: dict[str, Any]
