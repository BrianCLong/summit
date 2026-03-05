from typing import Dict, List

from .diff_format import validate_patch_change


def evidence_id(run_id: str, stage: str, counter: int) -> str:
    return f"EV-{run_id}-{stage}-{counter:03d}"


def build_patch_stack(run_id: str, stage: str, changes: List[Dict[str, str]]) -> Dict[str, object]:
    stack = []
    for counter, change in enumerate(changes, start=1):
        validate_patch_change(change)
        stack.append(
            {
                "evidence_id": evidence_id(run_id, stage, counter),
                "path": change["path"],
                "diff": change["diff"],
            }
        )
    return {"run_id": run_id, "stage": stage, "patches": stack}
