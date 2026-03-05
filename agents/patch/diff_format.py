from typing import Dict


class DiffPolicyError(ValueError):
    pass


def validate_patch_change(change: Dict[str, str]) -> None:
    if "path" not in change or "diff" not in change:
        raise DiffPolicyError("patch change must include path and diff")
