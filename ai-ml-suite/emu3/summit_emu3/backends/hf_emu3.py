import hashlib
import os
from datetime import datetime
from typing import Optional

# Conditional import to allow loading the module even if torch/transformers are missing
try:
    import torch
    from transformers import AutoImageProcessor, AutoModel, AutoTokenizer
    TRANSFORMERS_AVAILABLE = True
except ImportError:
    TRANSFORMERS_AVAILABLE = False

from ..adapter import Emu3BackendAdapter
from ..schema import MediaEvidenceV1, ProvenanceV1


def hf_enabled() -> bool:
    return os.getenv("SUMMIT_EMU3_ALLOW_MODEL_DOWNLOAD") == "1"

def trust_remote_code() -> bool:
    return os.getenv("SUMMIT_EMU3_TRUST_REMOTE_CODE") == "1"

class Emu3HFBackend(Emu3BackendAdapter):
    def __init__(self):
        if not TRANSFORMERS_AVAILABLE:
            raise ImportError("transformers/torch not installed. Install with 'pip install summit-emu3'")

        if not hf_enabled():
            raise RuntimeError(
                "HF backend disabled. Set SUMMIT_EMU3_ALLOW_MODEL_DOWNLOAD=1 to enable. "
                "Warning: This may download large files."
            )

        self.model_id = os.getenv("SUMMIT_EMU3_MODEL_ID", "baaivision/Emu3-Chat")
        self.tokenizer_id = os.getenv("SUMMIT_EMU3_TOKENIZER_ID", "baaivision/Emu3-VisionTokenizer")

        trust_remote = trust_remote_code()

        # Load Model (Lazy loading could be better, but we do it in init for now)
        # Note: Emu3 usage specifics would go here. For now we just instantiate the classes
        # to prove the integration point without downloading weights during this coding session.
        # In a real run, this would trigger download.

        # This is a mock implementation of the loading logic to avoid hitting HF during dev/test
        # unless explicitly requested.
        pass

    def generate_evidence(
        self,
        input_path: str,
        mode: str,
        question: Optional[str] = None
    ) -> MediaEvidenceV1:

        # In a real implementation, this would:
        # 1. Load image/video from input_path
        # 2. Tokenize
        # 3. Run model generation
        # 4. Decode output

        # For now, we simulate the output structure but enforce the checks.

        with open(input_path, "rb") as f:
            bytes_content = f.read()

        sha256 = hashlib.sha256(bytes_content).hexdigest()
        short_hash = sha256[:12]

        evidence_id = f"EVID:emu3-ntp:{short_hash}:{mode}:v1"
        timestamp = datetime.utcnow().isoformat() + "Z"

        provenance = ProvenanceV1(
            backend="hf_emu3",
            model_id=self.model_id,
            tokenizer_id=self.tokenizer_id,
            input_sha256=sha256,
            timestamp=timestamp
        )

        # Stubbed responses
        if mode == "caption":
            return MediaEvidenceV1(
                evidence_id=evidence_id,
                mode="caption",
                caption="[HF_MOCK] A cat sitting on a mat.",
                tags=["cat", "mat", "hf_backend"],
                provenance=provenance
            )
        elif mode == "vqa":
            return MediaEvidenceV1(
                evidence_id=evidence_id,
                mode="vqa",
                qa=[{"question": question, "answer": "[HF_MOCK] Yes."}],
                provenance=provenance
            )
        elif mode == "video-consistency":
            return MediaEvidenceV1(
                evidence_id=evidence_id,
                mode="video-consistency",
                consistency_score=0.95,
                provenance=provenance
            )
        else:
             raise ValueError(f"Unsupported mode: {mode}")
