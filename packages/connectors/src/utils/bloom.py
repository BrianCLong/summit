from __future__ import annotations

"""Probabilistic Bloom filter implementation used for deduplication."""

import hashlib
import math
from dataclasses import dataclass, field
from typing import Iterable, Tuple


@dataclass(slots=True)
class BloomFilter:
    capacity: int
    error_rate: float = 0.001
    _size: int = field(init=False, repr=False)
    _hashes: int = field(init=False, repr=False)
    _bits: bytearray = field(init=False, repr=False)

    def __post_init__(self) -> None:
        if self.capacity <= 0:
            raise ValueError("capacity must be > 0")
        if not 0 < self.error_rate < 1:
            raise ValueError("error_rate must be between 0 and 1")
        m = -(self.capacity * math.log(self.error_rate)) / (math.log(2) ** 2)
        self._size = max(8, int(m))
        k = (self._size / self.capacity) * math.log(2)
        self._hashes = max(1, int(k))
        self._bits = bytearray((self._size + 7) // 8)

    # ------------------------------------------------------------------
    def _positions(self, item: Tuple[str, ...]) -> Iterable[int]:
        payload = repr(item).encode("utf-8")
        for seed in range(self._hashes):
            h = hashlib.blake2b(payload, digest_size=8, person=seed.to_bytes(1, "big"))
            yield int.from_bytes(h.digest(), "big") % self._size

    def _get_bit(self, idx: int) -> int:
        byte_index, bit_index = divmod(idx, 8)
        return (self._bits[byte_index] >> bit_index) & 1

    def _set_bit(self, idx: int) -> None:
        byte_index, bit_index = divmod(idx, 8)
        self._bits[byte_index] |= 1 << bit_index

    def check_and_add(self, item: Tuple[str, ...]) -> bool:
        positions = list(self._positions(item))
        present = all(self._get_bit(p) for p in positions)
        if not present:
            for pos in positions:
                self._set_bit(pos)
        return present
