from __future__ import annotations

from abc import ABC, abstractmethod

from .envelope import SummitEnvelope


class ProtocolAdapter(ABC):
  """Maps between SummitEnvelope and an external protocol representation."""

  @abstractmethod
  def encode(self, env: SummitEnvelope) -> bytes: ...

  @abstractmethod
  def decode(self, payload: bytes) -> SummitEnvelope: ...
