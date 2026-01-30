import os
from pathlib import Path

class SkillExecPolicy:
    """
    Deny-by-default execution policy.
    """
    def __init__(self):
        # Allowlist of interpreters
        self.allowed_interpreters = {"python3", "bash"}
        self.enabled = os.getenv("SKILLS_EXEC_ENABLED", "false").lower() == "true"

    def check_exec(self, skill_id: str, interpreter: str, script_path: Path) -> bool:
        if not self.enabled:
            return False

        if interpreter not in self.allowed_interpreters:
            return False

        # Additional checks could go here (hashes, signatures)
        return True
