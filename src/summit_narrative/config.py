from dataclasses import dataclass


@dataclass(frozen=True)
class FeatureFlags:
    nog_enabled: bool = False
    orch_enabled: bool = False
    gov_enabled: bool = False
    sim_enabled: bool = False
    innovation_enabled: bool = False
