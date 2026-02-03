from dataclasses import dataclass


@dataclass(frozen=True)
class CopilotMetricsConfig:
    enabled: bool = False  # deny-by-default
    api_base_url: str = "https://api.github.com"
    api_version: str = "2022-11-28"
    residency_enabled: bool = False
    residency_region: str | None = None
