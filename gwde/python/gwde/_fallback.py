"""Pure Python fallback implementation of the GW-DE dual-entropy watermark."""
from __future__ import annotations

import math
import random
from dataclasses import dataclass
from typing import Dict, Iterable, List, Sequence, Tuple, Union

import numpy as np

ZERO_WIDTH_ZERO = "\u200b"
ZERO_WIDTH_ONE = "\u200c"
ZERO_WIDTH_META_START = "\u2063"
ZERO_WIDTH_META_END = "\u2064"

_METADATA_BYTES = 24
_METADATA_REPEAT = 4
_METADATA_BITS = _METADATA_BYTES * 8
_METADATA_SLOTS = _METADATA_BITS * _METADATA_REPEAT


@dataclass
class Metadata:
    version: int = 1
    state_seed: int = 0
    key_hash: int = 0
    fingerprint_length: int = 0


@dataclass
class Detection:
    score: float
    fp: float
    total_bits: int
    matching_bits: int
    metadata_valid: bool


Payload = Union[str, np.ndarray]


def _stable_hash(value: str) -> int:
    hash_value = 1469598103934665603
    for char in value.encode("utf-8"):
        hash_value ^= char
        hash_value = (hash_value * 1099511628211) & 0xFFFFFFFFFFFFFFFF
    return hash_value


def _stable_hash64(value: int) -> int:
    value &= 0xFFFFFFFFFFFFFFFF
    value ^= value >> 33
    value = (value * 0xFF51AFD7ED558CCD) & 0xFFFFFFFFFFFFFFFF
    value ^= value >> 33
    value = (value * 0xC4CEB9FE1A85EC53) & 0xFFFFFFFFFFFFFFFF
    value ^= value >> 33
    return value


def _pack_metadata(meta: Metadata) -> bytes:
    return (
        meta.version.to_bytes(4, "big")
        + meta.state_seed.to_bytes(8, "big")
        + meta.key_hash.to_bytes(8, "big")
        + meta.fingerprint_length.to_bytes(4, "big")
    )


def _unpack_metadata(raw_bits: Sequence[int]) -> Metadata | None:
    if len(raw_bits) != _METADATA_BITS:
        return None
    accum = bytearray(_METADATA_BYTES)
    for index, bit in enumerate(raw_bits):
        accum[index // 8] = ((accum[index // 8] << 1) | (bit & 1)) & 0xFF
    try:
        version = int.from_bytes(accum[0:4], "big")
        state_seed = int.from_bytes(accum[4:12], "big")
        key_hash = int.from_bytes(accum[12:20], "big")
        fingerprint_length = int.from_bytes(accum[20:24], "big")
    except ValueError:
        return None
    return Metadata(
        version=version,
        state_seed=state_seed,
        key_hash=key_hash,
        fingerprint_length=fingerprint_length,
    )


def _encode_zero_width_bits(bits: Iterable[int], include_sentinels: bool = False) -> str:
    pieces: List[str] = []
    if include_sentinels:
        pieces.append(ZERO_WIDTH_META_START)
    for bit in bits:
        pieces.append(ZERO_WIDTH_ONE if bit else ZERO_WIDTH_ZERO)
    if include_sentinels:
        pieces.append(ZERO_WIDTH_META_END)
    return "".join(pieces)


def _decode_zero_width_bits(text: str, offset: int, with_sentinels: bool = False) -> Tuple[List[int], int]:
    bits: List[int] = []
    i = offset
    if with_sentinels:
        if i >= len(text) or text[i] != ZERO_WIDTH_META_START:
            return bits, offset
        i += 1
    while i < len(text):
        char = text[i]
        if with_sentinels and char == ZERO_WIDTH_META_END:
            i += 1
            break
        if char == ZERO_WIDTH_ZERO:
            bits.append(0)
            i += 1
        elif char == ZERO_WIDTH_ONE:
            bits.append(1)
            i += 1
        else:
            if with_sentinels:
                i += 1
                continue
            break
    return bits, i


def _strip_zero_width(text: str) -> str:
    return "".join(
        c
        for c in text
        if c
        not in (ZERO_WIDTH_ZERO, ZERO_WIDTH_ONE, ZERO_WIDTH_META_START, ZERO_WIDTH_META_END)
    )


def _tokenize(text: str) -> List[str]:
    tokens: List[str] = []
    current: List[str] = []
    for char in text:
        if char.isspace():
            if current:
                tokens.append("".join(current))
                current = []
        else:
            current.append(char)
    if current:
        tokens.append("".join(current))
    return tokens


def _combined_bits(tokens: Sequence[str], state_seed: int, key_hash: int) -> List[int]:
    rng = random.Random((state_seed ^ key_hash) & 0xFFFFFFFFFFFFFFFF)
    bits: List[int] = []
    for idx, token in enumerate(tokens):
        content = _stable_hash(f"{token}:{idx}")
        content_bit = content & 1
        state_bit = rng.getrandbits(1)
        bits.append((content_bit ^ state_bit) & 1)
    return bits


def _image_combined_bits(payload: np.ndarray, skip_bits: int, state_seed: int, key_hash: int) -> List[int]:
    flat = payload.reshape(-1)
    if flat.size <= skip_bits:
        return []
    rng = random.Random((state_seed ^ key_hash) & 0xFFFFFFFFFFFFFFFF)
    bits: List[int] = []
    for idx in range(skip_bits, flat.size):
        mix = ((int(flat[idx]) & 0xFF) << 32) ^ idx
        content_bit = _stable_hash64(mix) & 1
        state_bit = rng.getrandbits(1)
        bits.append((content_bit ^ state_bit) & 1)
    return bits


def _encode_metadata(meta: Metadata) -> str:
    raw = _pack_metadata(meta)
    bits: List[int] = []
    for byte in raw:
        for shift in range(7, -1, -1):
            bits.append((byte >> shift) & 1)
    return _encode_zero_width_bits(bits, include_sentinels=True)


def _decode_metadata(text: str) -> Tuple[Metadata | None, int]:
    bits, end_offset = _decode_zero_width_bits(text, 0, with_sentinels=True)
    if len(bits) != _METADATA_BITS:
        return None, 0
    meta = _unpack_metadata(bits)
    return meta, end_offset


def _erfc(z: float) -> float:
    # Use math.erfc when available
    return math.erfc(z)


def _false_positive_rate(matches: int, total: int) -> float:
    if total <= 0:
        return 1.0
    mean = 0.5 * total
    variance = 0.25 * total
    z = (matches - mean) / math.sqrt(variance + 1e-9)
    return 0.5 * _erfc(z / math.sqrt(2.0))


def embed(payload: Payload, key: str, state_seed: int) -> Dict[str, object]:
    if isinstance(payload, str):
        cleaned = _strip_zero_width(payload)
        tokens = _tokenize(cleaned)
        meta = Metadata(
            version=1,
            state_seed=state_seed & 0xFFFFFFFFFFFFFFFF,
            key_hash=_stable_hash(key),
            fingerprint_length=len(tokens),
        )
        bits = _combined_bits(tokens, meta.state_seed, meta.key_hash)
        builder: List[str] = [_encode_metadata(meta)]
        token_index = 0
        current: List[str] = []
        for char in cleaned:
            if char.isspace():
                if current:
                    builder.append("".join(current))
                    if token_index < len(bits):
                        builder.append(_encode_zero_width_bits([bits[token_index]]))
                    token_index += 1
                    current = []
                builder.append(char)
            else:
                current.append(char)
        if current:
            builder.append("".join(current))
            if token_index < len(bits):
                builder.append(_encode_zero_width_bits([bits[token_index]]))
        watermarked = "".join(builder)
        return {
            "watermarked": watermarked,
            "fingerprint": bits,
            "metadata": {
                "version": meta.version,
                "state_seed": meta.state_seed,
                "key_hash": meta.key_hash,
                "fingerprint_length": meta.fingerprint_length,
            },
        }

    if isinstance(payload, np.ndarray):
        if payload.dtype != np.uint8:
            raise TypeError("Image payload must be uint8 array")
        if payload.ndim not in (2, 3):
            raise TypeError("Image payload must be 2D or 3D array")
        flat_size = int(np.prod(payload.shape))
        meta = Metadata(
            version=1,
            state_seed=state_seed & 0xFFFFFFFFFFFFFFFF,
            key_hash=_stable_hash(key),
            fingerprint_length=max(flat_size - _METADATA_SLOTS, 0),
        )
        if meta.fingerprint_length <= 0:
            raise ValueError("Image too small for watermark metadata")
        bits = _image_combined_bits(payload, _METADATA_SLOTS, meta.state_seed, meta.key_hash)
        watermarked = payload.copy().reshape(-1)
        raw_meta = _pack_metadata(meta)
        meta_bits: List[int] = []
        for byte in raw_meta:
            for shift in range(7, -1, -1):
                meta_bits.append((byte >> shift) & 1)
        for bit_index, bit in enumerate(meta_bits):
            for rep in range(_METADATA_REPEAT):
                slot = bit_index * _METADATA_REPEAT + rep
                if slot >= watermarked.size:
                    break
                watermarked[slot] = (watermarked[slot] & 0xFE) | bit
        for index, bit in enumerate(bits):
            position = index + _METADATA_SLOTS
            if position >= watermarked.size:
                break
            watermarked[position] = (watermarked[position] & 0xFE) | bit
        watermarked = watermarked.reshape(payload.shape)
        return {
            "watermarked": watermarked,
            "fingerprint": bits,
            "metadata": {
                "version": meta.version,
                "state_seed": meta.state_seed,
                "key_hash": meta.key_hash,
                "fingerprint_length": meta.fingerprint_length,
                "shape": tuple(int(dim) for dim in payload.shape),
            },
        }

    raise TypeError("Unsupported payload type")


def detect(payload: Payload) -> Detection:
    if isinstance(payload, str):
        meta, offset = _decode_metadata(payload)
        if not meta or meta.version != 1:
            return Detection(0.0, 1.0, 0, 0, False)
        stripped = _strip_zero_width(payload[offset:])
        tokens = _tokenize(stripped)
        expected = _combined_bits(tokens, meta.state_seed, meta.key_hash)
        extracted: List[int] = []
        token_index = 0
        for char in payload[offset:]:
            if char in (ZERO_WIDTH_ZERO, ZERO_WIDTH_ONE):
                if token_index < len(tokens):
                    extracted.append(1 if char == ZERO_WIDTH_ONE else 0)
                    token_index += 1
        total = min(len(extracted), len(expected))
        matches = sum(1 for idx in range(total) if extracted[idx] == expected[idx])
        score = (matches / total) if total else 0.0
        fp = _false_positive_rate(matches, total)
        return Detection(score, fp, total, matches, True)

    if isinstance(payload, np.ndarray):
        if payload.dtype != np.uint8:
            raise TypeError("Image payload must be uint8 array")
        if payload.ndim not in (2, 3):
            raise TypeError("Image payload must be 2D or 3D array")
        flat = payload.reshape(-1)
        if flat.size <= _METADATA_SLOTS:
            return Detection(0.0, 1.0, 0, 0, False)
        meta_samples = [int(flat[i] & 1) for i in range(_METADATA_SLOTS)]
        majority_bits: List[int] = []
        for bit_index in range(_METADATA_BITS):
            start = bit_index * _METADATA_REPEAT
            window = meta_samples[start:start + _METADATA_REPEAT]
            ones = sum(window)
            majority_bits.append(1 if ones > (_METADATA_REPEAT // 2) else 0)
        meta = _unpack_metadata(majority_bits)
        if not meta or meta.version != 1:
            return Detection(0.0, 1.0, 0, 0, False)
        expected = _image_combined_bits(payload, _METADATA_SLOTS, meta.state_seed, meta.key_hash)
        extracted = [int(flat[i] & 1) for i in range(_METADATA_SLOTS, _METADATA_SLOTS + meta.fingerprint_length)]
        total = min(len(expected), len(extracted))
        matches = sum(1 for idx in range(total) if expected[idx] == extracted[idx])
        score = (matches / total) if total else 0.0
        fp = _false_positive_rate(matches, total)
        return Detection(score, fp, total, matches, True)

    raise TypeError("Unsupported payload type")


__all__ = ["embed", "detect", "Detection", "Metadata"]

