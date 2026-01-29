from pathlib import Path
from .resources import ResourceResolver
from ..policy.skill_exec_policy import SkillExecPolicy

class SkillExecAdapter:
    def __init__(self, resolver: ResourceResolver, policy: SkillExecPolicy):
        self._resolver = resolver
        self._policy = policy

    def execute_script(self, skill_id: str, script_name: str, interpreter: str = "python3") -> str:
        # Check policy first
        # We need the path to check.
        try:
             script_path = self._resolver.get_resource_path(skill_id, script_name)
        except Exception as e:
             return f"Error resolving script: {e}"

        if not self._policy.check_exec(skill_id, interpreter, script_path):
             return "Execution denied by policy"

        # In a real system, this would call a runner/sandbox.
        # Here we just return a success message or mock output.
        return f"Executed {script_name} with {interpreter}"
