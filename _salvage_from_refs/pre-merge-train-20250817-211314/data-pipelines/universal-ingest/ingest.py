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
import json
import uuid
import xml.etree.ElementTree as ET
from dataclasses import dataclass, field
from pathlib import Path
from typing import Callable, Dict, Iterable, List, Tuple

from rapidfuzz import fuzz
try:
    import spacy
    NLP = spacy.load("en_core_web_sm")
except Exception:  # pragma: no cover - model is optional
    NLP = None

from neo4j import GraphDatabase, Driver


@dataclass
class Entity:
    id: str
    type: str
    name: str
    source: str
    attrs: Dict[str, str] = field(default_factory=dict)


@dataclass
class Relationship:
    source: str
    target: str
    type: str
    attrs: Dict[str, str] = field(default_factory=dict)


class EntityResolver:
    """Fuzzy entity resolution with optional NLP alias linking."""

    def __init__(self, threshold: int = 90):
        self.threshold = threshold

    def resolve(self, entities: List[Entity]) -> Dict[str, str]:
        """Return mapping of entity id -> canonical id."""
        canonical: Dict[str, str] = {}
        by_name: Dict[str, Entity] = {}
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


class GraphLoader:
    """Minimal Neo4j loader."""

    def __init__(self, uri: str, user: str, password: str):
        self.driver: Driver = GraphDatabase.driver(uri, auth=(user, password))

    def close(self) -> None:
        self.driver.close()

    def load(self, entities: Iterable[Entity], relationships: Iterable[Relationship]) -> None:
        with self.driver.session() as session:
            for e in entities:
                session.run(
                    """
                    MERGE (n:Entity {id: $id})
                    SET n.type = $type, n.name = $name, n.source = $source, n += $attrs
                    """,
                    id=e.id,
                    type=e.type,
                    name=e.name,
                    source=e.source,
                    attrs=e.attrs,
                )
            for r in relationships:
                session.run(
                    """
                    MATCH (a:Entity {id: $source}), (b:Entity {id: $target})
                    MERGE (a)-[rel:RELATIONSHIP {type: $type}]->(b)
                    SET rel += $attrs
                    """,
                    source=r.source,
                    target=r.target,
                    type=r.type,
                    attrs=r.attrs,
                )


class IngestionPipeline:
    """Coordinates parsers, entity resolution, and graph loading."""

    def __init__(self, loader: GraphLoader):
        self.loader = loader
        self.parsers: Dict[str, Callable[[Path, str], Tuple[List[Entity], List[Relationship]]]] = {}

    def register(self, extension: str, parser: Callable[[Path, str], Tuple[List[Entity], List[Relationship]]]) -> None:
        self.parsers[extension.lower()] = parser

    def ingest(self, path: Path, source: str) -> None:
        parser = self.parsers.get(path.suffix.lower())
        if not parser:
            raise ValueError(f"No parser registered for {path.suffix}")
        entities, relationships = parser(path, source)
        resolver = EntityResolver()
        mapping = resolver.resolve(entities)
        unique: Dict[str, Entity] = {}
        for ent in entities:
            ent.id = mapping.get(ent.id, ent.id)
            unique[ent.id] = ent
        for rel in relationships:
            rel.source = mapping.get(rel.source, rel.source)
            rel.target = mapping.get(rel.target, rel.target)
        self.loader.load(unique.values(), relationships)


# --- Parsers ---------------------------------------------------------------

def parse_csv(path: Path, source: str) -> Tuple[List[Entity], List[Relationship]]:
    entities: List[Entity] = []
    relationships: List[Relationship] = []
    with open(path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            eid = row.get("id") or str(uuid.uuid4())
            entities.append(
                Entity(
                    id=eid,
                    type=row.get("type", "Record"),
                    name=row.get("name", ""),
                    source=source,
                    attrs=row,
                )
            )
    return entities, relationships


def parse_json(path: Path, source: str) -> Tuple[List[Entity], List[Relationship]]:
    entities: List[Entity] = []
    relationships: List[Relationship] = []
    data = json.loads(path.read_text(encoding="utf-8"))
    records = data if isinstance(data, list) else data.get("records", [])
    for rec in records:
        eid = rec.get("id") or str(uuid.uuid4())
        entities.append(
            Entity(
                id=eid,
                type=rec.get("type", "Record"),
                name=rec.get("name", ""),
                source=source,
                attrs=rec,
            )
        )
    return entities, relationships


def parse_xml(path: Path, source: str) -> Tuple[List[Entity], List[Relationship]]:
    entities: List[Entity] = []
    relationships: List[Relationship] = []
    root = ET.parse(path).getroot()
    for elem in root.findall(".//record"):
        attrs = {child.tag: child.text or "" for child in elem}
        eid = attrs.get("id") or str(uuid.uuid4())
        entities.append(
            Entity(
                id=eid,
                type=attrs.get("type", "Record"),
                name=attrs.get("name", ""),
                source=source,
                attrs=attrs,
            )
        )
    return entities, relationships


def parse_text(path: Path, source: str) -> Tuple[List[Entity], List[Relationship]]:
    entities: List[Entity] = []
    relationships: List[Relationship] = []
    text = path.read_text(encoding="utf-8")
    if NLP:
        doc = NLP(text)
        for ent in doc.ents:
            entities.append(
                Entity(
                    id=str(uuid.uuid4()),
                    type=ent.label_,
                    name=ent.text,
                    source=source,
                )
            )
    else:  # fallback: naive capitalised tokens
        for token in text.split():
            if token.istitle():
                entities.append(
                    Entity(id=str(uuid.uuid4()), type="Token", name=token, source=source)
                )
    return entities, relationships


def parse_geojson(path: Path, source: str) -> Tuple[List[Entity], List[Relationship]]:
    entities: List[Entity] = []
    relationships: List[Relationship] = []
    data = json.loads(path.read_text(encoding="utf-8"))
    for feat in data.get("features", []):
        props = feat.get("properties", {})
        geom = feat.get("geometry", {})
        eid = props.get("id") or str(uuid.uuid4())
        entities.append(
            Entity(
                id=eid,
                type=geom.get("type", "Feature"),
                name=props.get("name") or props.get("title") or "feature",
                source=source,
                attrs={**props, "geometry": geom},
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
    parser.add_argument("source", help="Data source type, e.g., HUMINT, SIGINT, GEOINT, OSINT")
    parser.add_argument("files", nargs="+", type=Path, help="Files to ingest")
    parser.add_argument("--neo4j-uri", default="bolt://localhost:7687")
    parser.add_argument("--neo4j-user", default="neo4j")
    parser.add_argument("--neo4j-password", default="password")
    args = parser.parse_args()

    pipeline = build_pipeline(args.neo4j_uri, args.neo4j_user, args.neo4j_password)
    for file_path in args.files:
        pipeline.ingest(file_path, args.source)
    pipeline.loader.close()
