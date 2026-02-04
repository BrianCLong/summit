from dataclasses import dataclass


@dataclass(frozen=True)
class AgenticWebConfig:
    enabled: bool = False
    attribution_mode: str = "off"  # off|coarse|hashed
    scrubber_strict: bool = True
