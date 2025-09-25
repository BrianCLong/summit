"""Blocking index backed by Redis and MinHash LSH."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable, Sequence

from datasketch import MinHash, MinHashLSH

from .features import tokenize
from .models import Entity


@dataclass
class BlockingResult:
    pairs: list[tuple[str, str]]
    comparisons: int


class RedisBlockingIndex:
    """Provides deterministic candidate generation using Redis-backed LSH."""

    def __init__(self, redis_client, namespace: str = "er:block", num_perm: int = 64) -> None:
        self.redis = redis_client
        self.namespace = namespace
        self.num_perm = num_perm

    def _minhash(self, tokens: Iterable[str]) -> MinHash:
        mh = MinHash(num_perm=self.num_perm)
        for token in tokens:
            mh.update(token.encode("utf-8"))
        return mh

    def _supports_redis_storage(self) -> bool:
        module_name = self.redis.__class__.__module__
        return "fakeredis" not in module_name

    def _lsh(self, threshold: float) -> MinHashLSH:
        if self._supports_redis_storage():
            params = getattr(self.redis, "connection_pool").connection_kwargs
            storage = {
                "type": "redis",
                "redis": {
                    "host": params.get("host", "localhost"),
                    "port": params.get("port", 6379),
                    "db": params.get("db", 0),
                },
                "namespace": f"{self.namespace}:lsh",
            }
            return MinHashLSH(threshold=threshold, num_perm=self.num_perm, storage_config=storage)
        return MinHashLSH(threshold=threshold, num_perm=self.num_perm)

    def clear(self) -> None:
        keys = list(self.redis.scan_iter(f"{self.namespace}:*"))
        if keys:
            self.redis.delete(*keys)

    def index_entities(self, entities: Sequence[Entity]) -> None:
        for entity in entities:
            tokens = tokenize(entity)
            if tokens:
                self.redis.sadd(f"{self.namespace}:entity:{entity.id}", *tokens)

    def generate(self, entities: Sequence[Entity], threshold: float) -> BlockingResult:
        lsh = self._lsh(threshold)
        minhashes: dict[str, MinHash] = {}
        self.index_entities(entities)

        for entity in entities:
            mh = self._minhash(tokenize(entity))
            lsh.insert(entity.id, mh)
            minhashes[entity.id] = mh

        seen: set[tuple[str, str]] = set()
        pairs: list[tuple[str, str]] = []
        comparisons = 0
        for entity in entities:
            matches = lsh.query(minhashes[entity.id])
            for candidate_id in matches:
                if candidate_id == entity.id:
                    continue
                pair = tuple(sorted((entity.id, candidate_id)))
                if pair in seen:
                    continue
                seen.add(pair)
                pairs.append(pair)
                comparisons += 1
        if not pairs:
            for idx, entity in enumerate(entities):
                for other in entities[idx + 1 :]:
                    pair = tuple(sorted((entity.id, other.id)))
                    if pair in seen:
                        continue
                    seen.add(pair)
                    pairs.append(pair)
                    comparisons += 1
        return BlockingResult(pairs=pairs, comparisons=comparisons)
