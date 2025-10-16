from __future__ import annotations

try:
    from neo4j import AsyncDriver
except Exception:  # pragma: no cover - neo4j may not be installed
    AsyncDriver = None  # type: ignore


async def fetch_neighbour_entities(driver: AsyncDriver | None, entity_id: str) -> list[str]:
    """Return ids of entities connected to ``entity_id``.

    When ``driver`` is ``None`` an empty list is returned which keeps the
    function usable in tests without a running Neo4j instance.
    """

    if driver is None:
        return []

    query = "MATCH (e)-[:RELATED_TO]-(n) WHERE e.id = $id RETURN n.id AS id"
    async with driver.session() as session:  # pragma: no cover - network I/O
        result = await session.run(query, id=entity_id)
        return [record["id"] for record in await result.data()]
