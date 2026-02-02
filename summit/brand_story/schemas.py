from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional

@dataclass(frozen=True)
class BrandStoryInput:
    defining_moments: List[str]
    mission: str
    audience_archetype: str
    goal: str
    tone: str = "authentic"
    quirks: List[str] = field(default_factory=list)
    constraints: List[str] = field(default_factory=list)

@dataclass(frozen=True)
class Episode:
    title: str
    hook: str
    tension: str
    twist: str
    lesson: str
    cta: str
    cliffhanger: str
    interactive_prompt: str

@dataclass(frozen=True)
class SeriesPlan:
    mission: str
    episodes: List[Episode]
    platform: str = "LinkedIn"
