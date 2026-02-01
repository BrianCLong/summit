from abc import ABC, abstractmethod
from .types import ScienceBatch, ScienceOutput, AdapterCapabilities

class ScienceModelAdapter(ABC):
  @abstractmethod
  def capabilities(self) -> AdapterCapabilities: ...

  @abstractmethod
  def predict(self, batch: ScienceBatch) -> ScienceOutput: ...
