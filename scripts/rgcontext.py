#!/usr/bin/env python3
"""CLI to enrich a case graph with contextual metadata."""

import argparse
import json

from ingestion.copilot_context import CopilotContextIngestor
from intelgraph_neo4j_client import IntelGraphNeo4jClient


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Ingest evidence for a case")
    parser.add_argument("case_id", help="Case identifier")
    parser.add_argument("--alert", help="Path to alert JSON")
    parser.add_argument("--log", help="Path to log JSON")
    parser.add_argument("--note", help="Freeform note text")
    return parser.parse_args()


def load_json(path: str) -> dict:
    with open(path, encoding="utf-8") as handle:
        return json.load(handle)


def main() -> None:
    args = parse_args()
    client = IntelGraphNeo4jClient(
        {
            "neo4j_uri": "bolt://localhost:7687",
            "neo4j_username": "neo4j",
            "neo4j_password": "password",
        }
    )
    ingestor = CopilotContextIngestor(client)
    if args.alert:
        ingestor.ingest_alert(args.case_id, load_json(args.alert))
    if args.log:
        ingestor.ingest_log(args.case_id, load_json(args.log))
    if args.note:
        ingestor.ingest_note(args.case_id, args.note)
    client.close()


if __name__ == "__main__":
    main()
