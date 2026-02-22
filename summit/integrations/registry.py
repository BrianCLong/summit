from dataclasses import dataclass
from typing import Dict, Optional, Tuple


@dataclass(frozen=True)
class IntegrationSpec:
  name: str
  kind: str
  never_log_fields: Tuple[str, ...] = ()


class IntegrationRegistry:
  def __init__(self) -> None:
    self._specs: Dict[str, IntegrationSpec] = {}

  def register(self, spec: IntegrationSpec) -> None:
    self._specs[spec.name] = spec

  def get(self, name: str) -> Optional[IntegrationSpec]:
    return self._specs.get(name)
