from dataclasses import dataclass, field
from typing import List, Optional, Dict, Any

@dataclass
class BrandStoryInput:
    platform: str
    audience_archetype: str
    goal: str
    defining_moments: List[str]
    mission: str
    quirks: List[str] = field(default_factory=list)

@dataclass
class Episode:
    title: str
    hook: str
    tension: str
    twist: str
    lesson: str
    cta: str
    cliffhanger: str
    interactive_prompt: str

@dataclass
class SeriesPlan:
    mission: str
    episodes: List[Episode]
    enabled: bool = True
    metadata: Dict[str, Any] = field(default_factory=dict)
