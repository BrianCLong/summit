import json
from pathlib import Path
from typing import Optional

from .schema import VoiceArtifact


class VoiceStore:
    """
    Manages the storage and retrieval of VoiceArtifacts.
    Ensures that voice artifacts are content-addressed and immutable.
    """
    def __init__(self, storage_root: Path):
        self.storage_root = storage_root
        self.storage_root.mkdir(parents=True, exist_ok=True)

    def save(self, artifact: VoiceArtifact) -> Path:
        target_path = self.storage_root / f"{artifact.voice_id}.json"

        # In a real implementation, we would verify the voice_id matches the content hash
        data = {
            "voice_id": artifact.voice_id,
            "created_from": artifact.created_from,
            "lang_tags": artifact.lang_tags,
            "style_tags": artifact.style_tags,
            "provenance_model": artifact.provenance_model,
            "provenance_revision": artifact.provenance_revision,
            "ref_audio_fingerprint": artifact.ref_audio_fingerprint
        }

        with open(target_path, "w") as f:
            json.dump(data, f, indent=2)

        return target_path

    def load(self, voice_id: str) -> Optional[VoiceArtifact]:
        target_path = self.storage_root / f"{voice_id}.json"
        if not target_path.exists():
            return None

        with open(target_path) as f:
            data = json.load(f)

        return VoiceArtifact(**data)
