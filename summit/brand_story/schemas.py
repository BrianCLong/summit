from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional


@dataclass
class BrandStoryInput:
    platform: str
    audience_archetype: str
    goal: str
    defining_moments: list[str]
    mission: str
    quirks: list[str] = field(default_factory=list)

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
    episodes: list[Episode]
    enabled: bool = True
    metadata: dict[str, Any] = field(default_factory=dict)
