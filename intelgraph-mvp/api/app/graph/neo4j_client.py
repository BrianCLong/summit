from __future__ import annotations

import uuid
from collections import defaultdict

from ..models import (
    Document,
    Event,
    Location,
    NodeBase,
    Org,
    Person,
    Relationship,
)


class InMemoryGraph:
    def __init__(self):
        self.nodes: dict[str, dict[str, NodeBase]] = defaultdict(dict)
        self.edges: list[Relationship] = []

    def create_node(self, label: str, data: dict) -> str:
        node_id = data.get("id") or str(uuid.uuid4())
        data["id"] = node_id
        model_cls = {
            "Person": Person,
            "Org": Org,
            "Location": Location,
            "Event": Event,
            "Document": Document,
        }[label]
        node = model_cls(**data)
        self.nodes[label][node_id] = node
        return node_id

    def get_nodes(self, label: str, tenant_id: str, case_id: str) -> list[NodeBase]:
        return [
            n
            for n in self.nodes.get(label, {}).values()
            if n.tenant_id == tenant_id and n.case_id == case_id
        ]

    def find_person_by_email_or_phone(
        self, email: str | None, phone: str | None, tenant_id: str, case_id: str
    ) -> Person | None:
        for n in self.get_nodes("Person", tenant_id, case_id):
            if email and email in n.emails:
                return n
            if phone and phone in n.phones:
                return n
        return None

    def create_edge(self, source: str, rel_type: str, target: str, data: dict) -> str:
        edge_id = data.get("id") or str(uuid.uuid4())
        data.update({"id": edge_id, "source": source, "target": target, "type": rel_type})
        edge = Relationship(**data)
        self.edges.append(edge)
        return edge_id

    def node_by_id(self, node_id: str) -> NodeBase | None:
        for d in self.nodes.values():
            if node_id in d:
                return d[node_id]
        return None

    def delete_node(self, node_id: str) -> None:
        for label, d in self.nodes.items():
            if node_id in d:
                del d[node_id]
                break
        self.edges = [e for e in self.edges if e.source != node_id and e.target != node_id]

    def replace_edges(self, old_id: str, new_id: str) -> None:
        for e in self.edges:
            if e.source == old_id:
                e.source = new_id
            if e.target == old_id:
                e.target = new_id


class Neo4jGraph:
    def __init__(self, uri: str, user: str, password: str):
        self.driver: Driver = GraphDatabase.driver(uri, auth=(user, password))

    def close(self) -> None:
        self.driver.close()

    def health_check(self) -> bool:
        try:
            self.driver.verify_connectivity()
            return True
        except Exception:
            return False

    def _run_write(self, query: str, **params):
        with self.driver.session() as session:
            return session.execute_write(lambda tx: tx.run(query, **params).data())

    def _run_read(self, query: str, **params):
        with self.driver.session() as session:
            return session.execute_read(lambda tx: tx.run(query, **params).data())

    def setup_constraints(self) -> None:
        labels = ["Person", "Org", "Event", "Location", "Document"]
        for label in labels:
            self._run_write(
                f"""
                CREATE CONSTRAINT {label.lower()}_id IF NOT EXISTS
                FOR (n:{label}) REQUIRE n.id IS UNIQUE
                """
            )
        self._run_write(
            """
            CREATE FULLTEXT INDEX entity_names IF NOT EXISTS FOR
            (n:Person|Org|Event|Location|Document) ON EACH [n.name]
            """
        )

    def merge_node(self, label: str, node_id: str, data: dict) -> str:
        properties = {k: v for k, v in data.items() if v is not None}
        self._run_write(
            f"""
            MERGE (n:{label} {{id: $id}})
            SET n += $props
            SET n.type = $label
            RETURN n.id as id
            """,
            id=node_id,
            props=properties,
            label=label,
        )
        return node_id

    def merge_edge(self, source: str, rel_type: str, target: str, data: dict) -> str:
        edge_id = data.get("id") or f"{source}:{rel_type}:{target}"
        properties = {k: v for k, v in data.items() if v is not None}
        self._run_write(
            f"""
            MATCH (a {{id: $source}})
            MATCH (b {{id: $target}})
            MERGE (a)-[r:{rel_type} {{id: $id}}]->(b)
            SET r += $props
            RETURN r.id as id
            """,
            source=source,
            target=target,
            id=edge_id,
            props=properties,
        )
        return edge_id

    def entity_by_id(self, node_id: str) -> dict | None:
        records = self._run_read(
            """
            MATCH (n {id: $id})
            RETURN n.id as id, head(labels(n)) as type, n.name as name, n
            """,
            id=node_id,
        )
        if not records:
            return None
        record = records[0]
        node_props = dict(record.get("n", {}))
        return {
            "id": record["id"],
            "type": record["type"],
            "name": record.get("name", node_props.get("title", "")),
            "properties": node_props,
        }

    def node_by_id(self, node_id: str):
        return self.entity_by_id(node_id)

    def search_entities(
        self, query: str, tenant_id: str, case_id: str, limit: int = 25
    ) -> list[dict]:
        try:
            rows = self._run_read(
                """
                CALL db.index.fulltext.queryNodes('entity_names', $query) YIELD node, score
                WHERE node.tenant_id = $tenant_id AND node.case_id = $case_id
                RETURN node.id as id, head(labels(node)) as type, node.name as name, node.policy as policy
                LIMIT $limit
                """,
                query=query,
                tenant_id=tenant_id,
                case_id=case_id,
                limit=limit,
            )
        except Exception:
            rows = self._run_read(
                """
                MATCH (n)
                WHERE n.tenant_id = $tenant_id AND n.case_id = $case_id
                  AND toLower(n.name) CONTAINS toLower($query)
                RETURN n.id as id, head(labels(n)) as type, n.name as name, n.policy as policy
                LIMIT $limit
                """,
                query=query,
                tenant_id=tenant_id,
                case_id=case_id,
                limit=limit,
            )
        return rows

    def neighbors(
        self, node_id: str, max_hops: int = 1, labels: Sequence[str] | None = None
    ) -> dict:
        rows = self._run_read(
            """
            MATCH (start {id: $id})
            MATCH p=(start)-[r*1..$max_hops]-(n)
            WHERE $labels = [] OR any(l IN labels(n) WHERE l IN $labels)
            WITH collect(DISTINCT n) + start AS nodes, collect(DISTINCT r) AS rels
            RETURN nodes, rels
            """,
            id=node_id,
            max_hops=max_hops,
            labels=list(labels or []),
        )
        if not rows:
            return {"nodes": [], "edges": []}
        nodes = []
        edges = []
        for record in rows:
            for node in record.get("nodes", []):
                nodes.append(
                    {
                        "id": node.get("id"),
                        "type": (node.labels and list(node.labels)[0])
                        if hasattr(node, "labels")
                        else node.get("type"),
                        "name": node.get("name", node.get("title", "")),
                        "properties": dict(node),
                    }
                )
            for rel_list in record.get("rels", []):
                for rel in rel_list:
                    edges.append(
                        {
                            "id": rel.get("id")
                            or f"{rel.start_node.get('id')}:{rel.type}:{rel.end_node.get('id')}",
                            "source": rel.start_node.get("id"),
                            "target": rel.end_node.get("id"),
                            "type": rel.type,
                        }
                    )
        # de-duplicate
        unique_nodes = {n["id"]: n for n in nodes if n.get("id")}
        unique_edges = {e["id"]: e for e in edges if e.get("id")}
        return {"nodes": list(unique_nodes.values()), "edges": list(unique_edges.values())}
