#!/usr/bin/env python3
"""Simple Neo4j schema migration runner.

Reads schema/migration.yaml and applies Cypher statements to move the
runtime graph to the target version. Supports dry runs and rollback.
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import List

import yaml
from neo4j import GraphDatabase

SCHEMA_DIR = Path(__file__).parent / "schema"
ACTIVE_VERSION_FILE = SCHEMA_DIR / "active_version.txt"
MIGRATION_FILE = SCHEMA_DIR / "migration.yaml"
HASH_FILE = SCHEMA_DIR / "version_hashes.json"


def read_active_version() -> str:
    return ACTIVE_VERSION_FILE.read_text().strip()


def load_migration() -> dict:
    with MIGRATION_FILE.open() as fh:
        return yaml.safe_load(fh)


def compute_hash(version: str) -> str:
    nodes = SCHEMA_DIR / f"graph_versions/{version}/nodes.json"
    rels = SCHEMA_DIR / f"graph_versions/{version}/relationships.json"
    cons = SCHEMA_DIR / f"graph_versions/{version}/constraints.cypher"
    import subprocess

    return subprocess.check_output(
        f"sha256sum {nodes} {rels} {cons} | sha256sum | awk '{{print $1}}'", shell=True, text=True
    ).strip()


def run_statements(driver, statements: List[str], dry_run: bool) -> None:
    for stmt in statements:
        if dry_run:
            print(f"DRY RUN: {stmt}")
        else:
            with driver.session() as session:
                session.run(stmt)
                print(f"APPLIED: {stmt}")


def migrate(uri: str, user: str, password: str, dry_run: bool, rollback: bool) -> None:
    migration = load_migration()
    current = read_active_version()
    target = migration["version"]

    if current == target and not rollback:
        print("Schema already at target version.")
        return

    driver = GraphDatabase.driver(uri, auth=(user, password))
    statements = migration["down" if rollback else "up"]
    run_statements(driver, statements, dry_run)

    if not dry_run:
        ACTIVE_VERSION_FILE.write_text(target if not rollback else current)
        hashes = json.loads(HASH_FILE.read_text()) if HASH_FILE.exists() else {}
        new_hash = compute_hash(target if not rollback else current)
        hashes[target if not rollback else current] = new_hash
        HASH_FILE.write_text(json.dumps(hashes, indent=2))
    driver.close()


def main() -> None:
    parser = argparse.ArgumentParser(description="Run Neo4j schema migrations")
    parser.add_argument("--uri", default="bolt://localhost:7687")
    parser.add_argument("--user", default="neo4j")
    parser.add_argument("--password", default="password")
    parser.add_argument("--dry-run", action="store_true", help="Preview the migration without executing")
    parser.add_argument("--rollback", action="store_true", help="Rollback using down statements")
    args = parser.parse_args()

    migrate(args.uri, args.user, args.password, args.dry_run, args.rollback)


if __name__ == "__main__":
    main()
