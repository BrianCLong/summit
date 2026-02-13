from dataclasses import dataclass

@dataclass(frozen=True)
class CompFeatInput:
  # TODO: replace with real schema once ITEM is provided
  raw: dict

@dataclass(frozen=True)
class CompFeatOutput:
  status: str
  details: dict

def run_compfeat(inp: CompFeatInput) -> CompFeatOutput:
  # Clean-room placeholder: deterministic, no side effects.
  return CompFeatOutput(status="not_implemented", details={"hint": "wire competitor spec in follow-up"})
