from typing import List, Dict, Tuple
from summit.modulith.config import ConfigWrapper
from summit.modulith.schemas import Violation

def verify_imports(
    import_graph: Dict[str, List[Tuple[str, int]]],
    config: ConfigWrapper
) -> List[Violation]:
    violations = []
    violation_count = 0

    for file_path, imports in import_graph.items():
        src_module = config.module_of(file_path)
        if not src_module:
            continue

        for import_path, line_number in imports:
            tgt_module = config.module_of_import(import_path)

            if not tgt_module or src_module == tgt_module:
                continue

            # Check if tgt_module is allowed
            allowed = config.allowed_dependencies(src_module)

            is_violation = False
            if tgt_module not in allowed:
                is_violation = True

            # Check for event-driven rule if enabled
            if not is_violation and config.rules.get("cross_module_requires_event"):
                # Check if import path includes 'events'
                # Simple heuristic: must be summit.module.events...
                expected_prefix = f"summit.{tgt_module}.events"
                if not import_path.startswith(expected_prefix):
                    is_violation = True

            if is_violation:
                violation_count += 1
                violations.append(Violation(
                    evidence_id=f"MBV-IMP-{violation_count:03d}",
                    from_module=src_module,
                    to_module=tgt_module,
                    file_path=file_path,
                    line_number=line_number,
                    import_path=import_path
                ))

    return violations
