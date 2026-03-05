from typing import Iterable


FORBIDDEN_PATTERNS = (
    "rm -rf",
    "curl http://",
    "curl https://",
    "BEGIN PRIVATE KEY",
)


class PatchPolicyViolation(ValueError):
    pass


def check_patch_policy(lines: Iterable[str]) -> None:
    for line in lines:
        for pattern in FORBIDDEN_PATTERNS:
            if pattern in line:
                raise PatchPolicyViolation(f"forbidden patch content: {pattern}")
