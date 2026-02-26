from __future__ import annotations

from summit.modulith.schemas import ModulithConfig, Violation
from summit.modulith.scanner import ImportEdge


def verify(edges: list[ImportEdge], dynamic_candidates: list[dict[str, object]], config: ModulithConfig) -> list[Violation]:
    violations: list[Violation] = []

    for edge in edges:
        if edge.source_module == edge.target_module:
            continue
        if config.rules.cross_module_requires_event and ".events" not in edge.target_import:
            violations.append(
                {
                    "evidence_code": "IMP",
                    "rule": "cross_module_requires_event",
                    "from_module": edge.source_module,
                    "to_module": edge.target_module,
                    "source_file": edge.source_file,
                    "line": edge.line,
                    "target_import": edge.target_import,
                    "message": "Cross-module imports must use event namespace",
                }
            )
            continue
        if not config.allowed(edge.source_module, edge.target_module):
            violations.append(
                {
                    "evidence_code": "IMP",
                    "rule": "allowed_dependency_matrix",
                    "from_module": edge.source_module,
                    "to_module": edge.target_module,
                    "source_file": edge.source_file,
                    "line": edge.line,
                    "target_import": edge.target_import,
                    "message": "Cross-module dependency is not allowlisted",
                }
            )

    for candidate in dynamic_candidates:
        if str(candidate["source_module"]) == str(candidate["target_module"]):
            continue
        violations.append(
            {
                "evidence_code": "DYN",
                "rule": "dynamic_import_cross_module",
                "from_module": candidate["source_module"],
                "to_module": candidate["target_module"],
                "source_file": candidate["source_file"],
                "line": candidate["line"],
                "target_import": candidate["target_import"],
                "message": "Dynamic import across modules is denied by default",
            }
        )

    for index, violation in enumerate(sorted(violations, key=lambda v: (v["source_file"], v["line"], v["target_import"], v["rule"])), start=1):
        violation["evidence_id"] = f"MBV-{violation['evidence_code']}-{index:03d}"

    return violations
