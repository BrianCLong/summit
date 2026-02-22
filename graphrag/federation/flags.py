import os
def federation_enabled() -> bool:
  return os.getenv("GRAPHRAG_FEDERATION_ENABLE","0") == "1"
