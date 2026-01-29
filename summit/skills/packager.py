import os

SKILLS_PACKAGER_ENABLED = os.getenv("SKILLS_PACKAGER_ENABLED", "false").lower() == "true"

class SkillPackager:
    def __init__(self):
        if not SKILLS_PACKAGER_ENABLED:
            raise RuntimeError("Skill packager is feature-flagged OFF.")

    def draft_from_run(self, run_id: str):
        pass
