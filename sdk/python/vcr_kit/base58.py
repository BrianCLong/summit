"""Minimal Base58 codec compatible with Bitcoin alphabet."""

ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"
ALPHABET_INDEX = {ch: idx for idx, ch in enumerate(ALPHABET)}


def b58decode(value: str) -> bytes:
    value = value.strip()
    if not value:
        return b""
    num = 0
    for char in value:
        if char not in ALPHABET_INDEX:
            raise ValueError(f"Invalid base58 character: {char}")
        num = num * 58 + ALPHABET_INDEX[char]
    # Convert to bytes
    result = bytearray()
    while num > 0:
        num, rem = divmod(num, 256)
        result.append(rem)
    # Handle leading zeros
    pad = 0
    for char in value:
        if char == "1":
            pad += 1
        else:
            break
    return b"\x00" * pad + bytes(reversed(result))
