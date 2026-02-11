from __future__ import annotations

from pathlib import Path


def lint_policy(skill_root: Path) -> list[str]:
    # Placeholder for policy linting
    # For now, it just checks if skill.policy.yaml exists if expected
    policy_file = skill_root / "skill.policy.yaml"
    if not policy_file.exists():
        # Not a failure, but could be a warning in the future
        return []
    return []

if __name__ == "__main__":
    import sys
    print("Policy lint stub passed.")
    sys.exit(0)
