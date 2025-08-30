import hashlib


def embed(text: str) -> list[float]:
    h = hashlib.sha256(text.encode()).digest()
    # produce deterministic 6-d vector
    return [int.from_bytes(h[i : i + 4], "big") / 2**32 for i in range(0, 24, 4)]
