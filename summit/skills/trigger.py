from .registry import SkillRegistry
from .loader import SkillLoader
from ..policy.skills_acl import SkillsACL, TriggerContext

class SkillTriggerRouter:
    def __init__(self, registry: SkillRegistry, loader: SkillLoader, acl: SkillsACL):
        self._registry = registry
        self._loader = loader
        self._acl = acl

    def trigger(self, context: TriggerContext, command: str) -> str:
        # Expect command format: /skill <name>
        if not command.startswith("/skill "):
             return "Invalid command format"

        skill_id = command.split(" ", 1)[1].strip()

        if not self._acl.can_trigger(context, skill_id):
            return f"Access denied: cannot trigger skill {skill_id}"

        skill = self._registry.get(skill_id)
        if not skill:
            return f"Skill {skill_id} not found"

        instructions = self._loader.load_instructions(skill_id)
        return instructions
