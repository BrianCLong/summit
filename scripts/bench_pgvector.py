#!/usr/bin/env python3
"""
Benchmark pgvector HNSW parameters across embedding dimensions.

The script seeds synthetic embeddings for multiple tenants, builds HNSW
indexes with different `m` and `ef_construction` settings, and measures
query latency at various `ef_search` levels. Results are printed in a
compact table and can optionally be exported to JSON or CSV for offline analysis.
"""

import argparse
import csv
import json
import math
import os
import random
import statistics
import time
from collections.abc import Iterable, Sequence
from pathlib import Path

import psycopg2
from psycopg2.extras import execute_values

DEFAULT_EMBEDDING_SIZES = [384, 768, 1536]
DEFAULT_M_VALUES = [8, 16, 32]
DEFAULT_EF_CONSTRUCTION = [100, 200, 400]
DEFAULT_EF_SEARCH = [50, 100, 200]
DEFAULT_SAMPLES = 15
DEFAULT_WARMUP = 3


def vector_literal(values: Sequence[float]) -> str:
    return f"[{','.join(f'{v:.6f}' for v in values)}]"


def percentile(values: list[float], pct: float) -> float:
    ordered = sorted(values)
    k = (len(ordered) - 1) * pct
    lower = math.floor(k)
    upper = math.ceil(k)
    if lower == upper:
        return ordered[int(k)]
    return ordered[lower] + (ordered[upper] - ordered[lower]) * (k - lower)


def seed_embeddings(conn, dimension: int, rows: int, tenants: int) -> None:
    with conn.cursor() as cur:
        cur.execute("CREATE EXTENSION IF NOT EXISTS vector;")
        cur.execute("DROP TABLE IF EXISTS bench_entity_embeddings;")
        cur.execute(
            f"""
            CREATE TABLE bench_entity_embeddings (
                id BIGSERIAL PRIMARY KEY,
                tenant_id TEXT NOT NULL,
                embedding VECTOR({dimension}) NOT NULL,
                updated_at TIMESTAMPTZ DEFAULT NOW()
            );
            """
        )

        records = []
        tenant_labels = [f"tenant-{i + 1}" for i in range(tenants)]
        base_count = rows // tenants
        remainder = rows - base_count * tenants
        for idx, tenant_id in enumerate(tenant_labels):
            tenant_rows = base_count + (1 if idx < remainder else 0)
            for _ in range(tenant_rows):
                embedding = [random.random() for _ in range(dimension)]
                records.append((tenant_id, vector_literal(embedding)))

        execute_values(
            cur,
            "INSERT INTO bench_entity_embeddings (tenant_id, embedding) VALUES %s",
            records,
        )
        cur.execute("ANALYZE bench_entity_embeddings;")
    conn.commit()


def build_index(conn, m: int, ef_construction: int) -> float:
    started = time.perf_counter()
    with conn.cursor() as cur:
        cur.execute("DROP INDEX IF EXISTS bench_entity_embeddings_hnsw;")
        cur.execute(
            f"""
            CREATE INDEX bench_entity_embeddings_hnsw
            ON bench_entity_embeddings
            USING hnsw (embedding vector_cosine_ops)
            WITH (m = {m}, ef_construction = {ef_construction});
            """
        )
    conn.commit()
    return (time.perf_counter() - started) * 1000


def warm_up(cur, dimension: int, ef_search: int, repeats: int) -> None:
    for _ in range(repeats):
        probe = [random.random() for _ in range(dimension)]
        cur.execute("BEGIN;")
        cur.execute("SET LOCAL hnsw.ef_search = %s;", (ef_search,))
        cur.execute(
            """
            SELECT id
            FROM bench_entity_embeddings
            ORDER BY embedding <=> %s
            LIMIT 5;
            """,
            (vector_literal(probe),),
        )
        cur.execute("COMMIT;")


def measure_latency(
    conn, dimension: int, ef_search: int, samples: int, warmups: int
) -> tuple[float, float]:
    timings: list[float] = []
    with conn.cursor() as cur:
        if warmups:
            warm_up(cur, dimension, ef_search, warmups)
        for _ in range(samples):
            probe = [random.random() for _ in range(dimension)]
            cur.execute("BEGIN;")
            cur.execute("SET LOCAL hnsw.ef_search = %s;", (ef_search,))
            start = time.perf_counter()
            cur.execute(
                """
                SELECT id
                FROM bench_entity_embeddings
                ORDER BY embedding <=> %s
                LIMIT 10;
                """,
                (vector_literal(probe),),
            )
            cur.execute("COMMIT;")
            timings.append((time.perf_counter() - start) * 1000)
    return statistics.mean(timings), percentile(timings, 0.99)


def run_benchmarks(
    conn,
    dimensions: Iterable[int],
    m_values: Iterable[int],
    ef_construction_values: Iterable[int],
    ef_search_values: Iterable[int],
    rows: int,
    tenants: int,
    samples: int,
    warmups: int,
) -> dict[int, list[dict[str, float]]]:
    results: dict[int, list[dict[str, float]]] = {}
    for dimension in dimensions:
        seed_embeddings(conn, dimension, rows, tenants)
        dimension_results: list[dict[str, float]] = []

        for m in m_values:
            for ef_construction in ef_construction_values:
                build_ms = build_index(conn, m, ef_construction)
                for ef_search in ef_search_values:
                    avg_ms, p99_ms = measure_latency(conn, dimension, ef_search, samples, warmups)
                    dimension_results.append(
                        {
                            "dimension": dimension,
                            "m": m,
                            "ef_construction": ef_construction,
                            "ef_search": ef_search,
                            "build_ms": build_ms,
                            "avg_ms": avg_ms,
                            "p99_ms": p99_ms,
                            "samples": samples,
                            "warmups": warmups,
                            "rows": rows,
                            "tenants": tenants,
                        }
                    )
        results[dimension] = dimension_results
    return results


def print_results(results: dict[int, list[dict[str, float]]]) -> None:
    print("\nHNSW Parameter Benchmarks")
    print("dimension | m  | ef_construction | ef_search | build_ms | avg_ms | p99_ms | samples")
    print("----------|----|-----------------|-----------|----------|--------|--------|--------")
    for dimension, measurements in results.items():
        for row in sorted(
            measurements,
            key=lambda r: (r["dimension"], r["m"], r["ef_construction"], r["ef_search"]),
        ):
            print(
                f"{dimension:<9} | {row['m']:<2} | {row['ef_construction']:<15} | {row['ef_search']:<9} | {row['build_ms']:.1f} | {row['avg_ms']:.2f} | {row['p99_ms']:.2f} | {row['samples']}"
            )


def write_json(results: dict[int, list[dict[str, float]]], path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(results, indent=2))


def write_csv(results: dict[int, list[dict[str, float]]], path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    flat_rows = [
        {
            "dimension": row["dimension"],
            "m": row["m"],
            "ef_construction": row["ef_construction"],
            "ef_search": row["ef_search"],
            "build_ms": f"{row['build_ms']:.1f}",
            "avg_ms": f"{row['avg_ms']:.2f}",
            "p99_ms": f"{row['p99_ms']:.2f}",
            "samples": row["samples"],
            "warmups": row["warmups"],
            "rows": row["rows"],
            "tenants": row["tenants"],
        }
        for dimension_rows in results.values()
        for row in dimension_rows
    ]
    with path.open("w", newline="") as csvfile:
        writer = csv.DictWriter(
            csvfile,
            fieldnames=[
                "dimension",
                "m",
                "ef_construction",
                "ef_search",
                "build_ms",
                "avg_ms",
                "p99_ms",
                "samples",
                "warmups",
                "rows",
                "tenants",
            ],
        )
        writer.writeheader()
        writer.writerows(flat_rows)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Benchmark pgvector HNSW parameters")
    parser.add_argument(
        "--dsn",
        default=os.environ.get("DATABASE_URL", "postgresql://localhost:5432/postgres"),
        help="PostgreSQL connection string",
    )
    parser.add_argument("--rows", type=int, default=10_000, help="Rows to seed per run")
    parser.add_argument("--tenants", type=int, default=4, help="Tenant cardinality for benchmarks")
    parser.add_argument(
        "--dimensions",
        type=str,
        default=",".join(str(s) for s in DEFAULT_EMBEDDING_SIZES),
        help="Comma-separated embedding dimensions",
    )
    parser.add_argument(
        "--m",
        type=str,
        default=",".join(str(v) for v in DEFAULT_M_VALUES),
        help="Comma-separated m values",
    )
    parser.add_argument(
        "--ef-construction",
        type=str,
        default=",".join(str(v) for v in DEFAULT_EF_CONSTRUCTION),
        help="Comma-separated ef_construction values",
    )
    parser.add_argument(
        "--ef-search",
        type=str,
        default=",".join(str(v) for v in DEFAULT_EF_SEARCH),
        help="Comma-separated ef_search values",
    )
    parser.add_argument(
        "--samples",
        type=int,
        default=DEFAULT_SAMPLES,
        help="Number of latency samples per parameter combo",
    )
    parser.add_argument(
        "--warmup",
        type=int,
        default=DEFAULT_WARMUP,
        help="Warmup queries to prime buffers before sampling",
    )
    parser.add_argument(
        "--output-json",
        type=Path,
        help="Optional path to write raw benchmark results as JSON",
    )
    parser.add_argument(
        "--output-csv",
        type=Path,
        help="Optional path to write raw benchmark results as CSV",
    )
    parser.add_argument(
        "--seed",
        type=int,
        help="Optional random seed for reproducible benchmark runs",
    )
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()
    if args.seed is not None:
        random.seed(args.seed)
    else:
        random.seed()
    conn = psycopg2.connect(args.dsn)
    conn.autocommit = True

    dimensions = [int(v) for v in args.dimensions.split(",") if v]
    m_values = [int(v) for v in args.m.split(",") if v]
    ef_construction_values = [int(v) for v in args.ef_construction.split(",") if v]
    ef_search_values = [int(v) for v in args.ef_search.split(",") if v]

    try:
        results = run_benchmarks(
            conn,
            dimensions,
            m_values,
            ef_construction_values,
            ef_search_values,
            args.rows,
            args.tenants,
            args.samples,
            args.warmup,
        )
        print_results(results)
        if args.output_json:
            write_json(results, args.output_json)
        if args.output_csv:
            write_csv(results, args.output_csv)
    finally:
        conn.close()
