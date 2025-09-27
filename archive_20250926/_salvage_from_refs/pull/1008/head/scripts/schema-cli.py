#!/usr/bin/env python3
"""Command line helpers for the schema registry."""
from __future__ import annotations

import argparse
import subprocess
from pathlib import Path

import json

from run_cypher_migrations import load_migration, read_active_version, migrate, SCHEMA_DIR


def cmd_init(args):
    print(f"Active schema version: {read_active_version()}")


def cmd_diff(args):
    migration = load_migration()
    print(f"Current: {read_active_version()} -> Target: {migration['version']}")
    for op in migration.get("operations", []):
        print(op)


def cmd_migrate(args):
    migrate(args.uri, args.user, args.password, args.dry_run, rollback=False)


def cmd_rollback(args):
    migrate(args.uri, args.user, args.password, args.dry_run, rollback=True)


def cmd_validate(args):
    subprocess.run(["pytest", "tests/test_schema_consistency.py"], check=False)
    # Check schema hash matches registry
    version = read_active_version()
    hashes = json.loads((SCHEMA_DIR / "version_hashes.json").read_text())
    expected = hashes.get(version)
    current = subprocess.check_output(
        f"sha256sum {SCHEMA_DIR}/graph_versions/{version}/nodes.json {SCHEMA_DIR}/graph_versions/{version}/relationships.json {SCHEMA_DIR}/graph_versions/{version}/constraints.cypher | sha256sum | awk '{{print $1}}'",
        shell=True,
        text=True,
    ).strip()
    if expected and current != expected:
        print("WARNING: runtime schema hash differs from registry")


def cmd_snapshot(args):
    version = read_active_version()
    nodes = SCHEMA_DIR / f"graph_versions/{version}/nodes.json"
    rels = SCHEMA_DIR / f"graph_versions/{version}/relationships.json"
    cons = SCHEMA_DIR / f"graph_versions/{version}/constraints.cypher"
    sha = subprocess.check_output(
        f"sha256sum {nodes} {rels} {cons} | sha256sum | awk '{{print $1}}'", shell=True, text=True
    ).strip()
    print(sha)
    (SCHEMA_DIR / f"graph_versions/{version}/hash.txt").write_text(sha)


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(description="Schema registry utility")
    sub = p.add_subparsers(dest="command", required=True)

    sub.add_parser("init").set_defaults(func=cmd_init)
    sub.add_parser("diff").set_defaults(func=cmd_diff)

    m = sub.add_parser("migrate")
    m.add_argument("--uri", default="bolt://localhost:7687")
    m.add_argument("--user", default="neo4j")
    m.add_argument("--password", default="password")
    m.add_argument("--dry-run", action="store_true")
    m.set_defaults(func=cmd_migrate)

    r = sub.add_parser("rollback")
    r.add_argument("--uri", default="bolt://localhost:7687")
    r.add_argument("--user", default="neo4j")
    r.add_argument("--password", default="password")
    r.add_argument("--dry-run", action="store_true")
    r.set_defaults(func=cmd_rollback)

    sub.add_parser("validate").set_defaults(func=cmd_validate)
    sub.add_parser("snapshot").set_defaults(func=cmd_snapshot)
    return p


def main() -> None:
    parser = build_parser()
    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
