from dataclasses import dataclass


@dataclass(frozen=True)
class SkillForgeConfig:
    # Feature flags (deny-by-default)
    SKILLFORGE_ENABLE: bool = False
    SKILLFORGE_EVAL_ENABLE: bool = False
    SKILLFORGE_GENERATE_ENABLE: bool = False

    # Output paths
    EVIDENCE_ROOT: str = "evidence/skillforge"
