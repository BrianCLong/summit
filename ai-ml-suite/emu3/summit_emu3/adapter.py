from abc import ABC, abstractmethod
from typing import Optional, List, Dict
from .schema import MediaEvidenceV1

class Emu3BackendAdapter(ABC):
    @abstractmethod
    def generate_evidence(
        self,
        input_path: str,
        mode: str,
        question: Optional[str] = None
    ) -> MediaEvidenceV1:
        """
        Generates MediaEvidenceV1 from an input media file.
        """
        pass
