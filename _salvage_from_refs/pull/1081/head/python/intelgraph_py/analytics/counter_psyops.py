from __future__ import annotations

from collections.abc import Iterable
from dataclasses import dataclass

RED = "\033[91m"
RESET = "\033[0m"


@dataclass(frozen=True)
class SourceClaim:
    source: str
    entity: str
    claim: str


def detect_misleading_information(claims: Iterable[SourceClaim]) -> list[str]:
    """Detect conflicting claims across sources.

    Groups claims by entity and flags those where multiple distinct claims
    exist. Each flagged source and entity is wrapped in ANSI red for review.
    """
    entity_map: dict[str, dict[str, list[str]]] = {}
    for sc in claims:
        entity_map.setdefault(sc.entity, {}).setdefault(sc.claim, []).append(sc.source)

    flagged: list[str] = []
    for entity, claim_map in entity_map.items():
        if len(claim_map) > 1:
            for claim, sources in claim_map.items():
                for src in sources:
                    flagged.append(
                        f"{RED}{src}{RESET} reports '{claim}' about {RED}{entity}{RESET}"
                    )
    return flagged
