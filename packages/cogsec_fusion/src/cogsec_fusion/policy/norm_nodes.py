from typing import List, Dict

class NormDefinition:
    def __init__(self, id: str, citation: str, summary: str):
        self.id = id
        self.citation = citation
        self.summary = summary

ICRC_COGNITIVE_WARFARE = NormDefinition(
    id="NORM-ICRC-COGWAR-2026",
    citation="ICRC Blogs 2026",
    summary="Human brain should not become a battlefield; cognitive warfare limited by IHL/HRL."
)

NATO_COGNITIVE_CONCEPT = NormDefinition(
    id="NORM-NATO-ACT-2024",
    citation="NATO ACT 2024",
    summary="Cognitive Warfare Concept framing adversaries attacking trust via manipulation."
)

def get_active_norms() -> List[Dict]:
    return [
        vars(ICRC_COGNITIVE_WARFARE),
        vars(NATO_COGNITIVE_CONCEPT)
    ]
