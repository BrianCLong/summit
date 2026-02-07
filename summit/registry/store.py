import dataclasses
import json
from typing import Any

from .model import AgentDefinition, Capability, RegistryDocument, RiskTier


def _dict_to_agent(d: dict) -> AgentDefinition:
    # Handle Enum conversion
    if "risk_tier" in d and isinstance(d["risk_tier"], str):
        try:
            d["risk_tier"] = RiskTier(d["risk_tier"])
        except ValueError:
            # Fallback or error handling? For now let it raise or handle gracefully
            # If the value is invalid, RiskTier(val) will raise ValueError
            pass
    return AgentDefinition(**d)

def load_registry(path: str) -> RegistryDocument:
  try:
      with open(path, encoding="utf-8") as f:
        obj = json.loads(f.read())
  except FileNotFoundError:
      # Return empty document if file doesn't exist? Or let it crash?
      # The original code crashed. I'll stick to mostly original behavior but safe open.
      # Actually, original code just did `with open(path...)`.
      raise

  caps = [Capability(**c) for c in obj.get("capabilities", [])]
  agents = [_dict_to_agent(a) for a in obj.get("agents", [])]

  return RegistryDocument(
      version=obj.get("version", "1.0"),
      capabilities=caps,
      agents=agents,
      signature=obj.get("signature")
  )

class EnhancedJSONEncoder(json.JSONEncoder):
        def default(self, o):
            if dataclasses.is_dataclass(o):
                return dataclasses.asdict(o)
            if isinstance(o, RiskTier):
                return o.value
            return super().default(o)

def save_registry(path: str, doc: RegistryDocument) -> None:
    with open(path, "w", encoding="utf-8") as f:
        json.dump(doc, f, cls=EnhancedJSONEncoder, indent=2)
