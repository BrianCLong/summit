from dataclasses import dataclass
from typing import List, Dict, Any, Optional

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
class BrandStoryInput:
    defining_moments: List[str]
    mission: str
    platforms: List[str]
    audience: str
    quirks: List[str] = None
    tone: str = "authentic"
    truthfulness_mode: bool = True
