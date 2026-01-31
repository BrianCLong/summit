from dataclasses import dataclass
import os


@dataclass(frozen=True)
class SkillForgeConfig:
    # Feature flags (deny-by-default)
    SKILLFORGE_ENABLE: bool = False
    SKILLFORGE_EVAL_ENABLE: bool = False
    SKILLFORGE_GENERATE_ENABLE: bool = False

    # Output paths
    EVIDENCE_ROOT: str = "evidence/skillforge"

    @staticmethod
    def _parse_bool(name: str, default: bool) -> bool:
        val = os.environ.get(name)
        if val is None:
            return default
        return val.lower() in ("1", "true", "yes", "on")

    @classmethod
    def from_env(cls) -> "SkillForgeConfig":
        return cls(
            SKILLFORGE_ENABLE=cls._parse_bool("SKILLFORGE_ENABLE", False),
            SKILLFORGE_EVAL_ENABLE=cls._parse_bool("SKILLFORGE_EVAL_ENABLE", False),
            SKILLFORGE_GENERATE_ENABLE=cls._parse_bool(
                "SKILLFORGE_GENERATE_ENABLE", False
            ),
            EVIDENCE_ROOT=os.environ.get(
                "SKILLFORGE_EVIDENCE_ROOT", "evidence/skillforge"
            ),
        )
