from dataclasses import dataclass, field
from typing import Dict, List

@dataclass(frozen=True)
class PersonaContract:
  persona_id: str
  version: str
  allowed_style_axes: Dict[str, List[str]] = field(default_factory=dict)
  forbidden_axes: List[str] = field(default_factory=list)
  disclosures: List[str] = field(default_factory=list)

  def validate(self) -> None:
    if not self.persona_id or not self.version:
      raise ValueError("persona_id and version required")
    # deny-by-default: forbid known manipulative axes
    for bad in ["romantic_entanglement", "coercion", "authority_impersonation"]:
      if bad not in self.forbidden_axes:
        raise ValueError(f"forbidden_axes must include '{bad}'")
