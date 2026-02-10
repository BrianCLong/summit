from __future__ import annotations
from dataclasses import dataclass

@dataclass(frozen=True)
class PromptParts:
    system: str
    user: str

def assemble(*, contract_md: str, serialized_subgraph: str, user_query: str) -> PromptParts:
    system = f"{contract_md}\n\nCONTEXT:\n{serialized_subgraph}\n"
    user = f"USER QUERY:\n{user_query}\n\nReturn step-by-step instructions with citations."
    return PromptParts(system=system, user=user)
