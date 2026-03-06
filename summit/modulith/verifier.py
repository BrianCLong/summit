from __future__ import annotations

from dataclasses import dataclass

from .config import ModulithConfig
from .scanner import ImportEdge
from .schemas import EVIDENCE_ID_PREFIX


@dataclass(frozen=True)
class Violation:
    evidence_id: str
    code: str
    source_module: str
    target_module: str
    source_file: str
    import_symbol: str
    message: str


def verify_edges(edges: list[ImportEdge], config: ModulithConfig) -> list[Violation]:
    violations: list[Violation] = []
    for edge in edges:
        allowed = config.allowed_dependencies_for(edge.source_module)
        if edge.target_module not in allowed:
            violations.append(
                Violation(
                    evidence_id=f"{EVIDENCE_ID_PREFIX}-{len(violations) + 1:03d}",
                    code="MBV-IMP-001",
                    source_module=edge.source_module,
                    target_module=edge.target_module,
                    source_file=str(edge.source_file),
                    import_symbol=edge.target_symbol,
                    message="cross-module import is not declared in allowed_dependencies",
                )
            )
            continue

        if config.cross_module_requires_event and not edge.uses_event_channel:
            violations.append(
                Violation(
                    evidence_id=f"{EVIDENCE_ID_PREFIX}-{len(violations) + 1:03d}",
                    code="MBV-IMP-002",
                    source_module=edge.source_module,
                    target_module=edge.target_module,
                    source_file=str(edge.source_file),
                    import_symbol=edge.target_symbol,
                    message="cross-module import must use module event channel (.events)",
                )
            )
    return violations
