from __future__ import annotations

from typing import Any

from neo4j import GraphDatabase

from ..models import Entity, Relationship


class Neo4jStore:
    def __init__(self, uri: str, user: str, password: str, database: str | None = None):
        self._driver = GraphDatabase.driver(uri, auth=(user, password))
        self._db = database

    def close(self):
        self._driver.close()

    def _run(self, query: str, params: dict[str, Any]):
        with self._driver.session(database=self._db) as s:
            return s.run(query, params).data()

    def query(self, query: str, params: dict[str, Any] = None):
        if params is None:
            params = {}
        return self._run(query, params)

    def upsert_entity(self, e: Entity):
        q = (
            "MERGE (n:Entity {id: $id})\n"
            "SET n += $props, n.type = $type, n.updatedAt = timestamp()"
        )
        self._run(q, {"id": e.id, "type": e.type, "props": e.props})

    def upsert_relationship(self, r: Relationship):
        q = (
            "MERGE (a:Entity {id: $src})\n"
            "MERGE (b:Entity {id: $dst})\n"
            "MERGE (a)-[rel:REL {kind: $kind}]->(b)\n"
            "SET rel += $props, rel.start = $start, rel.end = $end, rel.confidence = $confidence, rel.updatedAt = timestamp()"
        )
        self._run(q, {**r.__dict__, "props": r.props})

    def neighbors(self, id: str, depth: int = 2):
        q = "MATCH (n:Entity {id:$id})-[r:REL*1..$depth]-(m)\n" "RETURN n, r, m"
        return self._run(q, {"id": id, "depth": depth})

    def delete_entity(self, id: str):
        q = "MATCH (n:Entity {id: $id}) DETACH DELETE n"
        self._run(q, {"id": id})

    def delete_relationship(self, src: str, dst: str, kind: str):
        q = (
            "MATCH (a:Entity {id: $src})-"
            "[r:REL {kind: $kind}]->"
            "(b:Entity {id: $dst}) DELETE r"
        )
        self._run(q, {"src": src, "dst": dst, "kind": kind})
