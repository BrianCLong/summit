#!/usr/bin/env python3
"""Full reindex utility for graph metadata search indices."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from simulated_ingestion.indexing import (  # noqa: E402
    GraphMetadataIndexer,
    load_graph_metadata_snapshot,
)


def parse_args() -> argparse.Namespace:
    default_snapshot = PROJECT_ROOT / "search" / "index" / "graph_metadata_snapshot.json"

    parser = argparse.ArgumentParser(description="Reindex Elasticsearch with graph metadata snapshot data")
    parser.add_argument(
        "--snapshot",
        type=Path,
        default=default_snapshot,
        help=f"Path to snapshot file (default: {default_snapshot})",
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=500,
        help="Number of documents per bulk request",
    )
    parser.add_argument(
        "--refresh",
        default="wait_for",
        help="Elasticsearch refresh policy (default: wait_for)",
    )
    parser.add_argument(
        "--purge",
        action="store_true",
        help="Drop and recreate indices before indexing",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print counts without sending data to Elasticsearch",
    )

    return parser.parse_args()


def main() -> int:
    args = parse_args()

    if not args.snapshot.exists():
        print(f"Snapshot not found at {args.snapshot}. Run the ingestion pipeline first.")
        return 2

    entities, relationships, metadata = load_graph_metadata_snapshot(args.snapshot)

    print("Graph metadata snapshot loaded")
    print(f"  Generated at: {metadata.get('generated_at')}")
    print(f"  Entities: {len(entities)}")
    print(f"  Relationships: {len(relationships)}")

    if args.dry_run:
        print("Dry run mode enabled — exiting before indexing")
        return 0

    indexer = GraphMetadataIndexer(batch_size=args.batch_size, refresh=args.refresh)
    if not indexer.enabled:
        print("Elasticsearch is unavailable. Aborting reindex.")
        return 1

    if args.purge:
        print("Purging existing indices before reindexing")
        indexer.reset_indices()

    indexer.index_entities(entities)
    indexer.index_relationships(relationships)
    indexer.flush()

    state = indexer.snapshot_state()
    print("Reindex complete")
    print(f"  Indexed entities: {len(state['entities'])}")
    print(f"  Indexed relationships: {len(state['relationships'])}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
