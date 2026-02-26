from __future__ import annotations

from dataclasses import dataclass

from .config import ModulithConfig
from .scanner import ImportEdge


@dataclass(frozen=True)
class Violation:
    evidence_id: str
    rule_id: str
    source_module: str
    target_module: str
    source_file: str
    import_name: str
    message: str



def verify_edges(edges: list[ImportEdge], config: ModulithConfig) -> list[Violation]:
    violations: list[Violation] = []

    for edge in edges:
        source = config.modules[edge.source_module]
        if edge.target_module not in source.allowed_dependencies:
            violations.append(
                Violation(
                    evidence_id=f"MBV-IMP-{len(violations) + 1:03d}",
                    rule_id="MBV-IMP-001",
                    source_module=edge.source_module,
                    target_module=edge.target_module,
                    source_file=edge.source_file,
                    import_name=edge.import_name,
                    message="Cross-module import is not in the allowlist matrix.",
                )
            )
            continue

        if config.rules.cross_module_requires_event and ".events" not in edge.import_name:
            violations.append(
                Violation(
                    evidence_id=f"MBV-EVT-{len(violations) + 1:03d}",
                    rule_id="MBV-EVT-001",
                    source_module=edge.source_module,
                    target_module=edge.target_module,
                    source_file=edge.source_file,
                    import_name=edge.import_name,
                    message="Cross-module import must use the events namespace.",
                )
            )

    return violations
