import json

from .model import Capability, RegistryDocument


def load_registry(path: str) -> RegistryDocument:
  with open(path, encoding="utf-8") as f:
    obj = json.loads(f.read())
  caps = [Capability(**c) for c in obj.get("capabilities", [])]
  return RegistryDocument(version=obj["version"], capabilities=caps, signature=obj.get("signature"))
