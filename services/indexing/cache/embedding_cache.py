import hashlib
from typing import Dict, List, Optional


class EmbeddingCache:
    def __init__(self, v="all-MiniLM-L6-v2"):
        self.v = v
        self.cache = {}

    def get(self, text):
        k = self._key(text)
        return self.cache.get(k)

    def set(self, text, e):
        k = self._key(text)
        self.cache[k] = e

    def _key(self, t):
        return hashlib.sha256((self.v + t).encode("utf-8")).hexdigest()


class AsyncEmbedder:
    def __init__(self, c: EmbeddingCache):
        self.c = c

    async def embed(self, chunks):
        res = []
        for c in chunks:
            cached = self.c.get(c)
            if cached:
                res.append(cached)
            else:
                e = [0.1] * 384
                res.append(e)
                self.c.set(c, e)
        return res
