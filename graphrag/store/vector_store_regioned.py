from typing import Iterable, List, Protocol

from graphrag.topology.router import RegionRoute


class VectorStoreRegioned(Protocol):
  def upsert_embeddings(self, route: RegionRoute, embeddings: Iterable[object]) -> None: ...
  def similarity_search(self, route: RegionRoute, query_embedding: list[float], k: int) -> list[object]: ...
