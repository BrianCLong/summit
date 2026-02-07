from dataclasses import dataclass
from typing import List, Literal, Optional


@dataclass(frozen=True)
class VoiceArtifact:
    """
    Summit VOICE artifact representation.
    Content-addressed and carries metadata about its provenance and intended use.
    """
    voice_id: str
    created_from: Literal["design", "clone", "import"]
    lang_tags: list[str]
    style_tags: list[str]
    provenance_model: str
    provenance_revision: Optional[str] = None
    ref_audio_fingerprint: Optional[str] = None  # Hash of reference audio if clone
