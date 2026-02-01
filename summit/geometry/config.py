from dataclasses import dataclass

@dataclass(frozen=True)
class GeometryMonitorConfig:
    enabled: bool = False
    sample_rate: float = 0.0
    max_points: int = 64
