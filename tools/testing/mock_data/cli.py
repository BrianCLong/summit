"""Command line entrypoint for the mock data generator."""
from __future__ import annotations

import argparse
import os
from pathlib import Path
from typing import Sequence

from .generator import MockDataGenerator

DEFAULT_POSTGRES_PATH = Path("server/db/seeds/postgres/30_mock_data.sql")
DEFAULT_NEO4J_PATH = Path("server/db/seeds/neo4j/30_mock_data.cypher")
DEFAULT_INGEST_PATH = Path("data-pipelines/universal-ingest/mock_ingest.csv")


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Generate mock datasets for Summit testing")
    parser.add_argument("--seed", type=int, help="Seed for deterministic output")

    subparsers = parser.add_subparsers(dest="command", required=True)

    def add_generate_arguments(subparser: argparse.ArgumentParser, *, default_output: Path | None = None) -> None:
        subparser.add_argument("--records", type=int, default=40, help="Number of entities to generate")
        if default_output is not None:
            subparser.add_argument(
                "--output",
                type=Path,
                default=default_output,
                help=f"Output file location (default: {default_output})",
            )

    postgres = subparsers.add_parser("postgres", help="Write Postgres seed SQL")
    add_generate_arguments(postgres, default_output=DEFAULT_POSTGRES_PATH)

    neo4j = subparsers.add_parser("neo4j", help="Write Neo4j seed Cypher")
    add_generate_arguments(neo4j, default_output=DEFAULT_NEO4J_PATH)

    ingest = subparsers.add_parser("ingest", help="Write ingest wizard CSV fixtures")
    add_generate_arguments(ingest, default_output=DEFAULT_INGEST_PATH)

    all_cmd = subparsers.add_parser("all", help="Generate Postgres, Neo4j, and ingest fixtures together")
    all_cmd.add_argument("--records", type=int, default=40, help="Number of entities to generate")
    all_cmd.add_argument("--postgres-output", type=Path, default=DEFAULT_POSTGRES_PATH)
    all_cmd.add_argument("--neo4j-output", type=Path, default=DEFAULT_NEO4J_PATH)
    all_cmd.add_argument("--ingest-output", type=Path, default=DEFAULT_INGEST_PATH)

    seed = subparsers.add_parser("seed", help="Generate data and feed it through the ingest wizard")
    seed.add_argument("--records", type=int, default=40, help="Number of entities to generate")
    seed.add_argument("--source", default="MOCK-SEED", help="Source label used by the ingest pipeline")
    seed.add_argument(
        "--neo4j-uri",
        default=os.environ.get("NEO4J_URI", "bolt://localhost:7687"),
        help="Neo4j connection URI",
    )
    seed.add_argument(
        "--neo4j-user",
        default=os.environ.get("NEO4J_USERNAME", os.environ.get("NEO4J_USER", "neo4j")),
        help="Neo4j username",
    )
    seed.add_argument(
        "--neo4j-password",
        default=os.environ.get("NEO4J_PASSWORD", "local_dev_pw"),
        help="Neo4j password",
    )
    seed.add_argument(
        "--output",
        type=Path,
        help="Optional CSV path to persist the generated ingest file",
    )

    return parser


def main(argv: Sequence[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)

    generator = MockDataGenerator(seed=args.seed)

    if args.command == "postgres":
        dataset = generator.generate(args.records)
        generator.write_postgres_sql(args.output, dataset=dataset)
        print(f"Wrote Postgres seed to {args.output}")
        return 0

    if args.command == "neo4j":
        dataset = generator.generate(args.records)
        generator.write_neo4j_cypher(args.output, dataset=dataset)
        print(f"Wrote Neo4j seed to {args.output}")
        return 0

    if args.command == "ingest":
        dataset = generator.generate(args.records)
        generator.write_ingest_csv(args.output, dataset=dataset)
        print(f"Wrote ingest CSV to {args.output}")
        return 0

    if args.command == "all":
        dataset = generator.generate(args.records)
        generator.write_postgres_sql(args.postgres_output, dataset=dataset)
        generator.write_neo4j_cypher(args.neo4j_output, dataset=dataset)
        generator.write_ingest_csv(args.ingest_output, dataset=dataset)
        print(
            "Generated Postgres, Neo4j, and ingest fixtures:\n"
            f"  Postgres → {args.postgres_output}\n"
            f"  Neo4j    → {args.neo4j_output}\n"
            f"  Ingest   → {args.ingest_output}"
        )
        return 0

    if args.command == "seed":
        metrics = generator.seed_with_ingest_pipeline(
            record_count=args.records,
            source=args.source,
            neo4j_uri=args.neo4j_uri,
            neo4j_user=args.neo4j_user,
            neo4j_password=args.neo4j_password,
            output_path=args.output,
        )
        metric_summary = ", ".join(
            f"{key}={value}" for key, value in sorted(metrics.items())
        )
        print(f"Seeded ingest pipeline ({metric_summary})")
        return 0

    parser.error("Unknown command")
    return 1


if __name__ == "__main__":  # pragma: no cover - manual invocation entrypoint
    raise SystemExit(main())
