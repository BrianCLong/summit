from dataclasses import dataclass

@dataclass
class TriggerContext:
    user_id: str
    roles: list[str]

class SkillsACL:
    """
    Control who can trigger which skill.
    """
    def can_trigger(self, context: TriggerContext, skill_id: str) -> bool:
        # Default policy: allow all for now, or deny by default.
        # Plan says: "ACL denies by default; tests include deny + allow fixtures."

        # Simple policy implementation:
        # If user has role 'admin', allow everything.
        # If user has role 'skill_user', allow 'good_minimal_skill'.

        if "admin" in context.roles:
            return True

        # Deny by default
        return False
