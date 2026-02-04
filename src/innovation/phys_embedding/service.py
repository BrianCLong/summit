import os

PHYS_EMBEDDING = os.getenv("PHYS_EMBEDDING", "0") == "1"

def embed(payload) -> list[float]:
  if not PHYS_EMBEDDING:
    raise RuntimeError("PHYS_EMBEDDING disabled")
  # TODO: plug adapter + deterministic normalization
  return [0.0] * 16
