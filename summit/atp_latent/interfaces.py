from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, Optional, Protocol, Tuple


@dataclass(frozen=True)
class LatentBatch:
  # Placeholder tensors/arrays; keep Any to avoid hard deps.
  latents: Any
  context: Any

class LatentCodec(Protocol):
  """Encodes discrete tokens -> continuous latents and decodes latents -> text/tokens."""
  def encode(self, tokens: Any, context: Any) -> LatentBatch: ...
  def decode(self, latents: Any, context: Any) -> Any: ...

@dataclass(frozen=True)
class VAELoss:
  recon: float
  kl: float
  total: float

class LatentSupervisor(Protocol):
  """Conditional VAE supervision for latent tokens."""
  def loss(self, batch: LatentBatch) -> VAELoss: ...
  def decode_for_reward(self, latents: Any, context: Any) -> Any:
    """Decode latents into comparable artifacts for coherence reward."""
    ...
