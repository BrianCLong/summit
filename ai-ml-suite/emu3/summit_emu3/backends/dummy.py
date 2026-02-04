import hashlib
from datetime import datetime
from typing import Optional

from ..adapter import Emu3BackendAdapter
from ..schema import MediaEvidenceV1, ProvenanceV1


class DummyBackend(Emu3BackendAdapter):
    def generate_evidence(
        self,
        input_path: str,
        mode: str,
        question: Optional[str] = None
    ) -> MediaEvidenceV1:

        # Calculate SHA256 of input path (simulating file hash)
        sha256 = hashlib.sha256(input_path.encode()).hexdigest()
        short_hash = sha256[:12]

        evidence_id = f"EVID:emu3-ntp:{short_hash}:{mode}:v1"
        timestamp = datetime.utcnow().isoformat() + "Z"

        provenance = ProvenanceV1(
            backend="dummy",
            model_id="dummy-model-v1",
            tokenizer_id="dummy-tokenizer-v1",
            input_sha256=sha256,
            timestamp=timestamp
        )

        if mode == "caption":
            return MediaEvidenceV1(
                evidence_id=evidence_id,
                mode="caption",
                caption="A deterministic dummy caption for testing.",
                tags=["dummy", "test", "deterministic"],
                provenance=provenance
            )
        elif mode == "vqa":
            return MediaEvidenceV1(
                evidence_id=evidence_id,
                mode="vqa",
                qa=[{"question": question or "What is this?", "answer": "This is a dummy response."}],
                provenance=provenance
            )
        elif mode == "video-consistency":
            return MediaEvidenceV1(
                evidence_id=evidence_id,
                mode="video-consistency",
                consistency_score=0.99,
                provenance=provenance
            )
        else:
            raise ValueError(f"Unsupported mode: {mode}")
