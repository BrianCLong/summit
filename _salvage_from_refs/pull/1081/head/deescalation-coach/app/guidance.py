"""Generate communication tips and evidence prompts."""

from __future__ import annotations

from typing import List

from .schemas import Guidance

DEFAULT_TIPS = [
    "avoid absolutist phrasing",
    "separate claims from opinions",
    "invite counter-evidence",
    "cite independent sources",
]


def evidence_questions(text: str) -> List[str]:
    return [
        "What primary source supports this claim?",
        "Are there independent sources that confirm it?",
    ]


def generate_guidance(text: str) -> Guidance:
    return Guidance(tips=DEFAULT_TIPS, evidence_prompts=evidence_questions(text))
