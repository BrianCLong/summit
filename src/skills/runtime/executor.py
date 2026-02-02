from __future__ import annotations
from dataclasses import dataclass
from pathlib import Path
import os

@dataclass(frozen=True)
class ExecRequest:
    skill_root: Path
    script_relpath: str

class SkillsExecutionDisabled(RuntimeError):
    pass

def execute(req: ExecRequest) -> int:
    if os.getenv("SKILLS_EXECUTION_ENABLED", "false").lower() != "true":
        raise SkillsExecutionDisabled("execution disabled (SKILLS_EXECUTION_ENABLED!=true)")
    # TODO: integrate sandbox runner (container/microVM). Do not run on host.
    raise NotImplementedError("sandbox runner not wired")
