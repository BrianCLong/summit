#!/usr/bin/env python3
"""Asset inventory CSV ingestor for IntelGraph.

Reads an asset inventory CSV and emits graph-ready JSON containing
`Asset` nodes linked to an `Org` node. The CSV is expected to contain
`asset_id`, `hostname`, `ip_address` and `cpe` columns.
"""
from __future__ import annotations

import argparse
import csv
import hashlib
import json
import uuid
from pathlib import Path


def _digest(data: dict) -> str:
    """Create a stable SHA256 digest for a record."""
    return hashlib.sha256(json.dumps(data, sort_keys=True).encode("utf-8")).hexdigest()


def load_assets_csv(path: Path, org: str) -> dict[str, list[dict]]:
    """Parse an asset inventory CSV file into graph structures.

    Parameters
    ----------
    path: Path
        Location of the asset CSV file.
    org: str
        Owning organisation name.
    """
    nodes: list[dict] = []
    edges: list[dict] = []

    org_id = f"org:{org}"
    org_node = {"id": org_id, "type": "Org", "name": org}
    org_node["ingest_id"] = _digest(org_node)
    nodes.append(org_node)

    with open(path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            asset_id = row.get("asset_id") or str(uuid.uuid4())
            node_id = f"asset:{asset_id}"
            asset_node = {
                "id": node_id,
                "type": "Asset",
                "name": row.get("hostname") or asset_id,
                "ip_address": row.get("ip_address", ""),
                "cpe": row.get("cpe", ""),
                "org": org,
            }
            asset_node["ingest_id"] = _digest(asset_node)
            nodes.append(asset_node)

            edge = {"source": org_id, "target": node_id, "type": "OWNS"}
            edge["ingest_id"] = _digest(edge)
            edges.append(edge)

    return {"nodes": nodes, "edges": edges}


def main() -> None:
    parser = argparse.ArgumentParser(description="Asset CSV to graph JSON")
    parser.add_argument("path", type=Path, help="Path to asset CSV file")
    parser.add_argument("--org", required=True, help="Owning organisation name")
    args = parser.parse_args()

    graph = load_assets_csv(args.path, args.org)
    print(json.dumps(graph, indent=2))


if __name__ == "__main__":
    main()
