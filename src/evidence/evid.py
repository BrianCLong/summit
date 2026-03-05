from __future__ import annotations

from src.evidence.hashing import sha256_text


def derive_evid(case_id: str, media_url: str, file_hash: str) -> str:
    seed = f"{media_url}\n{file_hash}"
    hash8 = sha256_text(seed)[:8]
    return f"EVID-{case_id}-{hash8}"
