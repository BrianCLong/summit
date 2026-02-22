from dataclasses import dataclass
from typing import Optional


@dataclass
class SourceSnapshot:
    """
    Represents a snapshot of a regulatory source at a point in time.
    """
    source_id: str
    retrieved_at: str  # ISO8601
    content_sha256: str
    canonical_url: str
    license_hint: Optional[str]
    raw_path: str
    normalized_text_path: str

    def to_dict(self):
        return {
            "source_id": self.source_id,
            "retrieved_at": self.retrieved_at,
            "content_sha256": self.content_sha256,
            "canonical_url": self.canonical_url,
            "license_hint": self.license_hint,
            "raw_path": self.raw_path,
            "normalized_text_path": self.normalized_text_path
        }
