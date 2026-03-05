from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class ModelCachePolicy:
  root: Path
  def qwen3_tts_dir(self, model_name: str) -> Path:
    # Canonical location: <root>/tts/qwen3/<MODEL_NAME>/
    return self.root / "tts" / "qwen3" / model_name
