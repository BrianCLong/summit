from dataclasses import dataclass
from typing import Any, Dict, Optional, Sequence

@dataclass(frozen=True)
class ScienceBatch:
  # Snapshots/images/spectra/scalars, stored as framework-native tensors externally
  payload: Any
  meta: Dict[str, Any]

@dataclass(frozen=True)
class ScienceOutput:
  prediction: Any
  aux: Dict[str, Any]

@dataclass(frozen=True)
class AdapterCapabilities:
  modalities: Sequence[str]          # e.g. ["fields"], ["imaging","spectra","scalar"]
  supports_long_horizon: bool
  supports_masked_modeling: bool
