from __future__ import annotations

import csv
import hashlib
import io
import json
import uuid
from datetime import datetime
from typing import Iterable, Mapping

from ..graph.neo4j_client import InMemoryGraph, Neo4jGraph
from ..models import Policy, Provenance

GraphLike = InMemoryGraph | Neo4jGraph


def _canonical_hash(row: Mapping[str, str]) -> str:
    return hashlib.sha256(json.dumps(row, sort_keys=True).encode()).hexdigest()


def _stable_id(prefix: str, tenant_id: str, case_id: str, *parts: str | None) -> str:
    values = [p for p in parts if p]
    if values:
        base = ":".join([prefix, tenant_id, case_id, *values])
    else:
        base = f"{prefix}:{tenant_id}:{case_id}:{uuid.uuid4()}"
    return base


def _parse_rows(file_content: bytes) -> list[dict[str, str]]:
    text = file_content.decode("utf-8")
    reader = csv.DictReader(io.StringIO(text))
    return list(reader)


def ingest_rows(
    graph: GraphLike,
    rows: Iterable[dict[str, str]] | bytes,
    mapping: dict[str, str],
    tenant_id: str,
    case_id: str,
    user_id: str,
    provenance: dict,
    policy: dict,
    provenance_store=None,
) -> None:
    if isinstance(rows, (bytes, bytearray)):
        rows = _parse_rows(rows)
    prov = Provenance(**provenance, collected_at=datetime.utcnow())
    pol = Policy(**policy)
    for row in rows:
        if provenance_store:
            provenance_store.record_hash(
                tenant_id=tenant_id,
                case_id=case_id,
                payload_hash=_canonical_hash(row),
                source=provenance.get("source", ""),
                actor=user_id,
            )
        person_fields = {k.split(".")[1]: row[v] for k, v in mapping.items() if k.startswith("person.")}
        email = person_fields.get("email")
        phone = person_fields.get("phone")
        person_id = _stable_id("person", tenant_id, case_id, email, phone, person_fields.get("name"))
        graph.merge_node(
            "Person",
            person_id,
            {
                "tenant_id": tenant_id,
                "case_id": case_id,
                "created_by": user_id,
                "created_at": datetime.utcnow().isoformat(),
                "provenance": prov.model_dump(),
                "policy": pol.model_dump(),
                "name": person_fields.get("name"),
                "emails": [email] if email else [],
                "phones": [phone] if phone else [],
            },
        )

        org_fields = {k.split(".")[1]: row[v] for k, v in mapping.items() if k.startswith("org.")}
        org_id = _stable_id("org", tenant_id, case_id, org_fields.get("name"))
        graph.merge_node(
            "Org",
            org_id,
            {
                "tenant_id": tenant_id,
                "case_id": case_id,
                "created_by": user_id,
                "created_at": datetime.utcnow().isoformat(),
                "provenance": prov.model_dump(),
                "policy": pol.model_dump(),
                "name": org_fields.get("name"),
            },
        )
        graph.merge_edge(
            person_id,
            "AFFILIATED_WITH",
            org_id,
            {
                "tenant_id": tenant_id,
                "case_id": case_id,
                "created_by": user_id,
                "created_at": datetime.utcnow().isoformat(),
                "provenance": prov.model_dump(),
                "policy": pol.model_dump(),
            },
        )

        event_fields = {k.split(".")[1]: row[v] for k, v in mapping.items() if k.startswith("event.")}
        occurred_raw = event_fields.get("occurred_at")
        event_id = _stable_id("event", tenant_id, case_id, event_fields.get("name"), occurred_raw)
        graph.merge_node(
            "Event",
            event_id,
            {
                "tenant_id": tenant_id,
                "case_id": case_id,
                "created_by": user_id,
                "created_at": datetime.utcnow().isoformat(),
                "provenance": prov.model_dump(),
                "policy": pol.model_dump(),
                "name": event_fields.get("name"),
                "occurred_at": occurred_raw,
            },
        )
        graph.merge_edge(
            person_id,
            "PRESENT_AT",
            event_id,
            {
                "tenant_id": tenant_id,
                "case_id": case_id,
                "created_by": user_id,
                "created_at": datetime.utcnow().isoformat(),
                "provenance": prov.model_dump(),
                "policy": pol.model_dump(),
            },
        )

        loc_fields = {k.split(".")[1]: row[v] for k, v in mapping.items() if k.startswith("location.")}
        location_id = _stable_id("location", tenant_id, case_id, loc_fields.get("name"))
        graph.merge_node(
            "Location",
            location_id,
            {
                "tenant_id": tenant_id,
                "case_id": case_id,
                "created_by": user_id,
                "created_at": datetime.utcnow().isoformat(),
                "provenance": prov.model_dump(),
                "policy": pol.model_dump(),
                "name": loc_fields.get("name"),
                "lat": float(loc_fields.get("lat")) if loc_fields.get("lat") else None,
                "lon": float(loc_fields.get("lon")) if loc_fields.get("lon") else None,
            },
        )
        graph.merge_edge(
            event_id,
            "OCCURRED_AT",
            location_id,
            {
                "tenant_id": tenant_id,
                "case_id": case_id,
                "created_by": user_id,
                "created_at": datetime.utcnow().isoformat(),
                "provenance": prov.model_dump(),
                "policy": pol.model_dump(),
            },
        )

        doc_fields = {k.split(".")[1]: row[v] for k, v in mapping.items() if k.startswith("document.")}
        doc_id = _stable_id("document", tenant_id, case_id, doc_fields.get("url"), doc_fields.get("title"))
        graph.merge_node(
            "Document",
            doc_id,
            {
                "tenant_id": tenant_id,
                "case_id": case_id,
                "created_by": user_id,
                "created_at": datetime.utcnow().isoformat(),
                "provenance": prov.model_dump(),
                "policy": pol.model_dump(),
                "title": doc_fields.get("title"),
                "url": doc_fields.get("url"),
            },
        )
        for target in [person_id, org_id, event_id, location_id]:
            graph.merge_edge(
                doc_id,
                "MENTIONS",
                target,
                {
                    "tenant_id": tenant_id,
                    "case_id": case_id,
                    "created_by": user_id,
                    "created_at": datetime.utcnow().isoformat(),
                    "provenance": prov.model_dump(),
                    "policy": pol.model_dump(),
                },
            )
