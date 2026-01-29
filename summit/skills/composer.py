import os

SKILLS_COMPOSE_ENABLED = os.getenv("SKILLS_COMPOSE_ENABLED", "false").lower() == "true"

class SkillComposer:
    def __init__(self):
        if not SKILLS_COMPOSE_ENABLED:
            raise RuntimeError("Skill composition is feature-flagged OFF.")

    def compose(self, skill_ids: list[str]):
        pass
