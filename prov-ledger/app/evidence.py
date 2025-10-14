from datetime import datetime
from typing import Dict
import uuid
from io import BytesIO

from .hashing import sha256_digest
from .signatures import verify_signature

_evidence: Dict[str, dict] = {}


def register_evidence(kind: str, url: str | None = None, content: bytes | None = None, title: str | None = None, signature: bytes | None = None, public_key: str | None = None) -> dict:
    evid_id = str(uuid.uuid4())
    data = content or (url or "").encode()
    h, length = sha256_digest(BytesIO(data))
    signed = False
    signer_fp = None
    if signature and public_key:
        signed, signer_fp = verify_signature(public_key, data, signature)
    evid = {
        "id": evid_id,
        "kind": kind,
        "title": title,
        "url": url,
        "hash": h,
        "mime": None,
        "created_at": datetime.utcnow().isoformat(),
        "signed": signed,
        "signer_fp": signer_fp,
    }
    _evidence[evid_id] = evid
    return evid


def get_evidence(eid: str) -> dict | None:
    return _evidence.get(eid)
