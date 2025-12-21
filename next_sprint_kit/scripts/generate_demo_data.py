from __future__ import annotations

import argparse
import hashlib
import json
import random
from dataclasses import dataclass
from datetime import datetime, timedelta
from pathlib import Path
from typing import Iterable, List, Tuple


@dataclass
class Entity:
    id: str
    label: str
    attributes: dict


@dataclass
class Relationship:
    start: str
    end: str
    type: str
    attributes: dict


def deterministic_random(seed: int) -> random.Random:
    rng = random.Random(seed)
    return rng


def write_jsonl(path: Path, rows: Iterable[dict]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as handle:
        for row in rows:
            handle.write(json.dumps(row, separators=(',', ':')) + "\n")


def checksum_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(8192), b""):
            digest.update(chunk)
    return digest.hexdigest()


def checksum_paths(paths: Iterable[Path]) -> str:
    digest = hashlib.sha256()
    for path in sorted(paths):
        digest.update(path.name.encode("utf-8"))
        digest.update(checksum_file(path).encode("utf-8"))
    return digest.hexdigest()


def build_entities(rng: random.Random) -> List[Entity]:
    regions = ["Baltic", "Andean", "Sahel", "Pacific", "Nordic"]
    topics = ["finance", "energy", "cyber", "logistics", "diplomacy"]
    entities: List[Entity] = []
    for idx, region in enumerate(regions, start=1):
        label = f"Case-{idx:03d}"
        entities.append(
            Entity(
                id=label,
                label="Investigation",
                attributes={
                    "region": region,
                    "priority": rng.choice(["high", "medium"]),
                    "opened_at": (datetime.utcnow() - timedelta(days=rng.randint(1, 30))).isoformat(),
                },
            )
        )
        for topic in topics:
            node_id = f"ENT-{idx:03d}-{topic[:3].upper()}"
            entities.append(
                Entity(
                    id=node_id,
                    label="Entity",
                    attributes={
                        "topic": topic,
                        "region": region,
                        "risk": rng.uniform(0.2, 0.9),
                    },
                )
            )
    return entities


def build_relationships(rng: random.Random, entities: List[Entity]) -> List[Relationship]:
    relationships: List[Relationship] = []
    case_entities = [e for e in entities if e.label == "Investigation"]
    leaf_entities = [e for e in entities if e.label == "Entity"]
    for case in case_entities:
        linked = rng.sample(leaf_entities, k=4)
        for leaf in linked:
            relationships.append(
                Relationship(
                    start=case.id,
                    end=leaf.id,
                    type="TRACKS",
                    attributes={"confidence": round(rng.uniform(0.65, 0.95), 2)},
                )
            )
    for _ in range(10):
        a, b = rng.sample(leaf_entities, k=2)
        relationships.append(
            Relationship(
                start=a.id,
                end=b.id,
                type=rng.choice(["LINKED_TO", "COMMUNICATES_WITH", "FUNDS"]),
                attributes={"weight": round(rng.uniform(0.1, 0.9), 2)},
            )
        )
    return relationships


def build_prompts() -> List[dict]:
    return [
        {"prompt": "Show energy entities communicating with finance entities in the Baltic", "expected": "MATCH"},
        {"prompt": "List logistics nodes linked to high-risk investigations", "expected": "MATCH"},
        {"prompt": "Find cyber actors funding diplomacy targets", "expected": "MATCH"},
        {"prompt": "Surface Sahel investigations with communications over 0.5 weight", "expected": "MATCH"},
        {"prompt": "Trace connections between Nordic finance and Pacific energy", "expected": "MATCH"},
    ]


def build_usage(rng: random.Random, burst: int) -> List[dict]:
    start = datetime.utcnow() - timedelta(hours=1)
    usage: List[dict] = []
    for minute in range(60):
        base_queries = rng.randint(10, 18)
        factor = burst if 20 <= minute <= 25 else 1
        count = base_queries * factor
        usage.append(
            {
                "timestamp": (start + timedelta(minutes=minute)).isoformat(),
                "queries": count,
                "cpu_hours": round(count * rng.uniform(0.01, 0.03), 4),
                "storage_gb": round(50 + rng.uniform(-2, 3), 2),
            }
        )
    return usage


def generate_graph(output_dir: Path, seed: int) -> Tuple[Path, Path, Path]:
    rng = deterministic_random(seed)
    entities = build_entities(rng)
    relationships = build_relationships(rng, entities)
    prompts = build_prompts()

    entities_path = output_dir / "entities.jsonl"
    relationships_path = output_dir / "relationships.jsonl"
    prompts_path = output_dir / "nl_prompts.jsonl"

    write_jsonl(entities_path, [e.__dict__ for e in entities])
    write_jsonl(relationships_path, [r.__dict__ for r in relationships])
    write_jsonl(prompts_path, prompts)

    return entities_path, relationships_path, prompts_path


def generate_usage(output_dir: Path, seed: int, burst: int) -> Path:
    rng = deterministic_random(seed + 99)
    usage = build_usage(rng, burst)
    usage_path = output_dir / "usage.jsonl"
    write_jsonl(usage_path, usage)
    return usage_path


def verify_outputs(paths: Iterable[Path]) -> None:
    checksums = {path.name: checksum_file(path) for path in paths}
    combined = checksum_paths(paths)
    print("Checksums:")
    for name, digest in checksums.items():
        print(f"  {name}: {digest}")
    print(f"Combined: {combined}")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate reproducible demo data fixtures.")
    parser.add_argument("--output-dir", default="next_sprint_kit/demo_data", type=Path)
    parser.add_argument("--seed", default=42, type=int)
    parser.add_argument("--kind", choices=["graph", "usage", "all"], default="all")
    parser.add_argument("--burst", default=1, type=int, help="Usage burst multiplier for chaos drills")
    parser.add_argument("--verify", action="store_true", help="Print checksums after generation")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    output_dir: Path = args.output_dir
    output_dir.mkdir(parents=True, exist_ok=True)

    generated: List[Path] = []

    if args.kind in ("graph", "all"):
        generated.extend(generate_graph(output_dir, args.seed))

    if args.kind in ("usage", "all"):
        generated.append(generate_usage(output_dir, args.seed, args.burst))

    if args.verify:
        verify_outputs(generated)
    else:
        print(f"Generated {len(generated)} files in {output_dir}")


if __name__ == "__main__":
    main()
