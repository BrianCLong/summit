import re

ASSERTIVE_VERBS = {"is", "are", "was", "were", "has", "have", "will", "claims"}


def extract_claims(text: str, lang: str | None = None) -> list[str]:
    sentences = re.split(r"[.!?]\s+", text)
    claims = []
    for s in sentences:
        tokens = s.lower().split()
        if any(v in tokens for v in ASSERTIVE_VERBS) and (
            any(t.isdigit() for t in tokens) or len(tokens) >= 3
        ):
            claims.append(s.strip())
    return claims
