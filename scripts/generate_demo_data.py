#!/usr/bin/env python3
"""Generate synthetic IntelGraph demo data with connectors and manifest-ready fixtures."""

import json
import random
from datetime import datetime, timedelta
from pathlib import Path

CONNECTORS = [
    "mail",
    "dns",
    "whois",
    "tls",
    "passive-dns",
    "social",
    "web-crawl",
    "geoip",
    "malware-feed",
    "darkweb",
]

random.seed(42)


def _timestamp(offset_minutes: int) -> str:
    return (datetime.utcnow() - timedelta(minutes=offset_minutes)).isoformat(timespec="seconds") + "Z"


def build_indicator(index: int) -> dict:
    connector = random.choice(CONNECTORS)
    return {
        "id": f"indicator-{index}",
        "type": random.choice(["domain", "ip", "hash", "url"]),
        "value": f"demo-{index}-{connector}.example",
        "source_connector": connector,
        "transform_hash": f"hash-{index:04d}",
        "ingested_at": _timestamp(index),
        "labels": ["demo", "synthetic"],
        "policy": {"license": "synthetic-only", "sensitivity": "unclassified"},
    }


def build_manifest(indicators: list[dict]) -> dict:
    return {
        "manifest_id": "demo-manifest-001",
        "created_at": datetime.utcnow().isoformat(timespec="seconds") + "Z",
        "source_count": len(indicators),
        "hash_tree": [item["transform_hash"] for item in indicators],
        "authority": {"warrant": "demo-ticket-123", "expires": _timestamp(-60)},
    }


def main() -> None:
    output_dir = Path(__file__).resolve().parent / "../test-data/demo"
    output_dir.mkdir(parents=True, exist_ok=True)

    indicators = [build_indicator(i) for i in range(1, 51)]
    manifest = build_manifest(indicators)

    (output_dir / "indicators.json").write_text(json.dumps(indicators, indent=2))
    (output_dir / "manifest.json").write_text(json.dumps(manifest, indent=2))
    print(f"Wrote {len(indicators)} indicators and manifest to {output_dir}")


if __name__ == "__main__":
    main()
