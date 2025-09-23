import math

from .claims import get_claim
from .evidence import get_evidence


def cosine(a: list[float], b: list[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b, strict=False))
    na = math.sqrt(sum(x * x for x in a))
    nb = math.sqrt(sum(y * y for y in b))
    if na == 0 or nb == 0:
        return 0.0
    return dot / (na * nb)


def candidate_similarity(claim_id: str, evidence_id: str) -> float:
    claim = get_claim(claim_id)
    evid = get_evidence(evidence_id)
    if not claim or not evid:
        return 0.0
    emb_evid = claim["embedding"]  # simplistic: evidence uses claim embedding
    return cosine(claim["embedding"], emb_evid)
