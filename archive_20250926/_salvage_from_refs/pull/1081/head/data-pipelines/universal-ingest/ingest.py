#!/usr/bin/env python3
"""Universal ingestion pipeline for IntelGraph.

Processes CSV, JSON, XML, plain text, and GeoJSON data from intelligence
sources (HUMINT, SIGINT, GEOINT, OSINT) and loads them into Neo4j.

Features
--------
* Modular parser registry for different formats
* Basic entity/relationship model normalisation
* Entity resolution using fuzzy matching + optional NLP alias linking
"""

from __future__ import annotations

import csv
import hashlib
import json
import time
import uuid
import xml.etree.ElementTree as ET
from collections.abc import Callable, Iterable
from dataclasses import asdict, dataclass, field
from pathlib import Path

from rapidfuzz import fuzz

try:
    import spacy

    NLP = spacy.load("en_core_web_sm")
except Exception:  # pragma: no cover - model is optional
    NLP = None

from neo4j import Driver, GraphDatabase


@dataclass
class Entity:
    id: str
    type: str
    name: str
    source: str
    attrs: dict[str, str] = field(default_factory=dict)
    ingest_id: str = ""


@dataclass
class Relationship:
    source: str
    target: str
    type: str
    attrs: dict[str, str] = field(default_factory=dict)
    ingest_id: str = ""


class EntityResolver:
    """Fuzzy entity resolution with optional NLP alias linking."""

    def __init__(self, threshold: int = 90):
        self.threshold = threshold

    def resolve(self, entities: list[Entity]) -> dict[str, str]:
        """Return mapping of entity id -> canonical id."""
        canonical: dict[str, str] = {}
        by_name: dict[str, Entity] = {}
        for ent in entities:
            name = ent.name.lower()
            if NLP:
                doc = NLP(ent.name)
                if doc.ents:
                    name = doc.ents[0].text.lower()
            match = by_name.get(name)
            if match and fuzz.ratio(ent.name, match.name) >= self.threshold:
                canonical[ent.id] = match.id
            else:
                by_name[name] = ent
                canonical[ent.id] = ent.id
        return canonical


def make_ingest_id(data: dict) -> str:
    """Generate stable hash for a record."""
    canonical = json.dumps(data, sort_keys=True)
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


class GraphLoader:
    """Neo4j loader with retry and DLQ support."""

    def __init__(self, uri: str, user: str, password: str, dlq_path: Path | None = None):
        self.driver: Driver = GraphDatabase.driver(uri, auth=(user, password))
        self.dlq_path = dlq_path or Path("uploads/dlq/dlq.jsonl")
        self.dlq_path.parent.mkdir(parents=True, exist_ok=True)
        with self.driver.session() as session:
            session.run(
                "CREATE CONSTRAINT IF NOT EXISTS FOR (n:Entity) REQUIRE n.ingest_id IS UNIQUE"
            )
            session.run(
                "CREATE CONSTRAINT IF NOT EXISTS FOR ()-[r:RELATIONSHIP]-() REQUIRE r.ingest_id IS UNIQUE"
            )

    def close(self) -> None:
        self.driver.close()

    def _run_with_retry(self, session, query: str, params: dict, record: dict) -> bool:
        delay = 1.0
        for _ in range(3):
            try:
                session.run(query, **params)
                return True
            except Exception:
                time.sleep(delay)
                delay *= 2
        with self.dlq_path.open("a", encoding="utf-8") as f:
            f.write(json.dumps(record) + "\n")
        return False

    def load(
        self, entities: Iterable[Entity], relationships: Iterable[Relationship]
    ) -> tuple[int, int]:
        upserts = 0
        dlq = 0
        with self.driver.session() as session:
            for e in entities:
                record = {"kind": "entity", "data": asdict(e)}
                ok = self._run_with_retry(
                    session,
                    """
                    MERGE (n:Entity {ingest_id: $ingest_id})
                    SET n.id = $id, n.type = $type, n.name = $name, n.source = $source, n += $attrs
                    """,
                    {
                        "ingest_id": e.ingest_id,
                        "id": e.id,
                        "type": e.type,
                        "name": e.name,
                        "source": e.source,
                        "attrs": e.attrs,
                    },
                    record,
                )
                if ok:
                    upserts += 1
                else:
                    dlq += 1
            for r in relationships:
                record = {"kind": "relationship", "data": asdict(r)}
                ok = self._run_with_retry(
                    session,
                    """
                    MATCH (a:Entity {ingest_id: $source}), (b:Entity {ingest_id: $target})
                    MERGE (a)-[rel:RELATIONSHIP {ingest_id: $ingest_id}]->(b)
                    SET rel.type = $type, rel += $attrs
                    """,
                    {
                        "source": r.source,
                        "target": r.target,
                        "ingest_id": r.ingest_id,
                        "type": r.type,
                        "attrs": r.attrs,
                    },
                    record,
                )
                if ok:
                    upserts += 1
                else:
                    dlq += 1
        return upserts, dlq


class IngestionPipeline:
    """Coordinates parsers, entity resolution, and graph loading."""

    def __init__(self, loader: GraphLoader):
        self.loader = loader
        self.parsers: dict[str, Callable[[Path, str], tuple[list[Entity], list[Relationship]]]] = {}

    def register(
        self, extension: str, parser: Callable[[Path, str], tuple[list[Entity], list[Relationship]]]
    ) -> None:
        self.parsers[extension.lower()] = parser

    def ingest(self, path: Path, source: str) -> dict[str, float]:
        parser = self.parsers.get(path.suffix.lower())
        if not parser:
            raise ValueError(f"No parser registered for {path.suffix}")
        start = time.time()
        entities, relationships = parser(path, source)
        metrics = {
            "processed": len(entities) + len(relationships),
            "upserts": 0,
            "dedup": 0,
            "dlq": 0,
        }
        resolver = EntityResolver()
        mapping = resolver.resolve(entities)
        id_to_ingest: dict[str, str] = {}
        unique_entities: dict[str, Entity] = {}
        for ent in entities:
            ent.id = mapping.get(ent.id, ent.id)
            id_to_ingest[ent.id] = ent.ingest_id
            if ent.ingest_id in unique_entities:
                metrics["dedup"] += 1
            else:
                unique_entities[ent.ingest_id] = ent
        unique_rels: dict[str, Relationship] = {}
        for rel in relationships:
            rel.source = id_to_ingest.get(mapping.get(rel.source, rel.source), rel.source)
            rel.target = id_to_ingest.get(mapping.get(rel.target, rel.target), rel.target)
            rel.ingest_id = make_ingest_id(
                {"s": rel.source, "t": rel.target, "type": rel.type, "attrs": rel.attrs}
            )
            if rel.ingest_id in unique_rels:
                metrics["dedup"] += 1
            else:
                unique_rels[rel.ingest_id] = rel
        up, dlq = self.loader.load(unique_entities.values(), unique_rels.values())
        metrics["upserts"] = up
        metrics["dlq"] = dlq
        metrics["latency_ms"] = (time.time() - start) * 1000
        print(
            f"Processed={metrics['processed']} upserts={metrics['upserts']} dedup={metrics['dedup']} dlq={metrics['dlq']} latency_ms={metrics['latency_ms']:.0f}"
        )
        return metrics


def replay_dlq(pipeline: IngestionPipeline, dlq_dir: Path, rate_limit: float = 0.0) -> None:
    file_path = dlq_dir / "dlq.jsonl"
    if not file_path.exists():
        return
    remaining: list[str] = []
    lines = file_path.read_text(encoding="utf-8").splitlines()
    for line in lines:
        rec = json.loads(line)
        kind = rec.get("kind")
        data = rec.get("data", {})
        try:
            if kind == "entity":
                pipeline.loader.load([Entity(**data)], [])
            else:
                pipeline.loader.load([], [Relationship(**data)])
        except Exception:
            remaining.append(line)
        time.sleep(rate_limit)
    file_path.write_text("\n".join(remaining), encoding="utf-8")


# --- Parsers ---------------------------------------------------------------


def parse_csv(path: Path, source: str) -> tuple[list[Entity], list[Relationship]]:
    entities: list[Entity] = []
    relationships: list[Relationship] = []
    with open(path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            eid = row.get("id") or str(uuid.uuid4())
            ingest_id = make_ingest_id({**row, "source": source})
            entities.append(
                Entity(
                    id=eid,
                    type=row.get("type", "Record"),
                    name=row.get("name", ""),
                    source=source,
                    attrs=row,
                    ingest_id=ingest_id,
                )
            )
    return entities, relationships


def parse_json(path: Path, source: str) -> tuple[list[Entity], list[Relationship]]:
    entities: list[Entity] = []
    relationships: list[Relationship] = []
    data = json.loads(path.read_text(encoding="utf-8"))
    records = data if isinstance(data, list) else data.get("records", [])
    for rec in records:
        eid = rec.get("id") or str(uuid.uuid4())
        ingest_id = make_ingest_id({**rec, "source": source})
        entities.append(
            Entity(
                id=eid,
                type=rec.get("type", "Record"),
                name=rec.get("name", ""),
                source=source,
                attrs=rec,
                ingest_id=ingest_id,
            )
        )
    return entities, relationships


def parse_xml(path: Path, source: str) -> tuple[list[Entity], list[Relationship]]:
    entities: list[Entity] = []
    relationships: list[Relationship] = []
    root = ET.parse(path).getroot()
    for elem in root.findall(".//record"):
        attrs = {child.tag: child.text or "" for child in elem}
        eid = attrs.get("id") or str(uuid.uuid4())
        ingest_id = make_ingest_id({**attrs, "source": source})
        entities.append(
            Entity(
                id=eid,
                type=attrs.get("type", "Record"),
                name=attrs.get("name", ""),
                source=source,
                attrs=attrs,
                ingest_id=ingest_id,
            )
        )
    return entities, relationships


def parse_text(path: Path, source: str) -> tuple[list[Entity], list[Relationship]]:
    entities: list[Entity] = []
    relationships: list[Relationship] = []
    text = path.read_text(encoding="utf-8")
    if NLP:
        doc = NLP(text)
        for ent in doc.ents:
            ingest_id = make_ingest_id({"name": ent.text, "type": ent.label_, "source": source})
            entities.append(
                Entity(
                    id=str(uuid.uuid4()),
                    type=ent.label_,
                    name=ent.text,
                    source=source,
                    ingest_id=ingest_id,
                )
            )
    else:  # fallback: naive capitalised tokens
        for token in text.split():
            if token.istitle():
                ingest_id = make_ingest_id({"name": token, "type": "Token", "source": source})
                entities.append(
                    Entity(
                        id=str(uuid.uuid4()),
                        type="Token",
                        name=token,
                        source=source,
                        ingest_id=ingest_id,
                    )
                )
    return entities, relationships


def parse_geojson(path: Path, source: str) -> tuple[list[Entity], list[Relationship]]:
    entities: list[Entity] = []
    relationships: list[Relationship] = []
    data = json.loads(path.read_text(encoding="utf-8"))
    for feat in data.get("features", []):
        props = feat.get("properties", {})
        geom = feat.get("geometry", {})
        eid = props.get("id") or str(uuid.uuid4())
        ingest_id = make_ingest_id({**props, "geometry": geom, "source": source})
        entities.append(
            Entity(
                id=eid,
                type=geom.get("type", "Feature"),
                name=props.get("name") or props.get("title") or "feature",
                source=source,
                attrs={**props, "geometry": geom},
                ingest_id=ingest_id,
            )
        )
    return entities, relationships


# --- Factory --------------------------------------------------------------


def build_pipeline(uri: str, user: str, password: str) -> IngestionPipeline:
    loader = GraphLoader(uri, user, password)
    pipeline = IngestionPipeline(loader)
    pipeline.register(".csv", parse_csv)
    pipeline.register(".json", parse_json)
    pipeline.register(".xml", parse_xml)
    pipeline.register(".txt", parse_text)
    pipeline.register(".geojson", parse_geojson)
    return pipeline


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Universal data ingestion pipeline")
    parser.add_argument(
        "source", nargs="?", help="Data source type, e.g., HUMINT, SIGINT, GEOINT, OSINT"
    )
    parser.add_argument("files", nargs="*", type=Path, help="Files to ingest")
    parser.add_argument("--neo4j-uri", default="bolt://localhost:7687")
    parser.add_argument("--neo4j-user", default="neo4j")
    parser.add_argument("--neo4j-password", default="password")
    parser.add_argument("--replay-dlq", type=Path, help="Replay records from DLQ directory")
    parser.add_argument(
        "--rate-limit", type=float, default=0.0, help="Seconds to wait between DLQ records"
    )
    args = parser.parse_args()

    pipeline = build_pipeline(args.neo4j_uri, args.neo4j_user, args.neo4j_password)
    if args.replay_dlq:
        replay_dlq(pipeline, args.replay_dlq, args.rate_limit)
    else:
        for file_path in args.files:
            pipeline.ingest(file_path, args.source)
    pipeline.loader.close()
