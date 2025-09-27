#!/usr/bin/env python3
"""Profile PostgreSQL table statistics for GraphQL consumption."""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
from datetime import datetime
from decimal import Decimal

import psycopg2
from psycopg2 import sql

NUMERIC_TYPES = {
    "smallint",
    "integer",
    "bigint",
    "decimal",
    "numeric",
    "real",
    "double precision",
    "serial",
    "bigserial",
    "smallserial",
}

def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Profile a PostgreSQL table")
    parser.add_argument("--table", required=True, help="Table name to profile")
    parser.add_argument("--schema", default=os.getenv("POSTGRES_SCHEMA", "public"), help="Schema containing the table (defaults to POSTGRES_SCHEMA or public)")
    parser.add_argument("--sample-size", type=int, default=5000, help="Number of rows sampled for value frequency")
    parser.add_argument("--top-k", type=int, default=5, help="Number of most common values to return per column")
    return parser.parse_args()

def decimal_default(value):
    if isinstance(value, Decimal):
        return float(value)
    if isinstance(value, datetime):
        return value.isoformat()
    return value

def normalise_table(table: str, schema: str | None) -> tuple[str, str]:
    table = table.strip()
    schema = (schema or "public").strip()
    if "." in table:
        schema, table = table.split(".", maxsplit=1)
    identifier = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*$")
    if not identifier.match(schema) or not identifier.match(table):
        raise ValueError("Invalid schema or table name")
    return schema, table

def connect():
    return psycopg2.connect(
        host=os.getenv("POSTGRES_HOST", "localhost"),
        port=int(os.getenv("POSTGRES_PORT", "5432")),
        user=os.getenv("POSTGRES_USER", "postgres"),
        password=os.getenv("POSTGRES_PASSWORD", "postgres"),
        dbname=os.getenv("POSTGRES_DB", "postgres"),
    )

def fetch_profile(schema: str, table: str, sample_size: int, top_k: int) -> dict:
    conn = connect()
    conn.autocommit = True
    try:
        with conn.cursor() as cur:
            cur.execute("""SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = %s AND table_name = %s ORDER BY ordinal_position""", (schema, table))
            columns = cur.fetchall()
            if not columns:
                raise ValueError("Table has no columns")
            table_ref = sql.SQL('.').join([sql.Identifier(schema), sql.Identifier(table)])
            cur.execute(sql.SQL("SELECT COUNT(*) FROM {}").format(table_ref))
            row_count = int(cur.fetchone()[0])
            profiles = []
            for column_name, data_type in columns:
                column_ref = sql.Identifier(column_name)
                metrics_query = sql.SQL("SELECT COUNT(*) FILTER (WHERE {} IS NULL) AS nulls, COUNT(DISTINCT {}) AS distincts FROM {}").format(column_ref, column_ref, table_ref)
                cur.execute(metrics_query)
                null_count, distinct_count = cur.fetchone()
                null_count = int(null_count or 0)
                distinct_count = int(distinct_count or 0)
                null_rate = float(null_count) / row_count * 100 if row_count else 0.0
                top_values = []
                if row_count and top_k > 0:
                    if sample_size and sample_size < row_count:
                        top_query = sql.SQL("SELECT value, COUNT(*) AS freq FROM (SELECT {}::text AS value FROM {} WHERE {} IS NOT NULL LIMIT %s) sample GROUP BY value ORDER BY freq DESC LIMIT %s").format(column_ref, table_ref, column_ref)
                        cur.execute(top_query, (sample_size, top_k))
                    else:
                        top_query = sql.SQL("SELECT {}::text AS value, COUNT(*) AS freq FROM {} WHERE {} IS NOT NULL GROUP BY {} ORDER BY freq DESC LIMIT %s").format(column_ref, table_ref, column_ref, column_ref)
                        cur.execute(top_query, (top_k,))
                    top_values = [{"value": row[0], "count": int(row[1])} for row in cur.fetchall()]
                numeric_summary = None
                if data_type.lower() in NUMERIC_TYPES and row_count:
                    cur.execute(sql.SQL("SELECT MIN({})::float8, MAX({})::float8, AVG({})::float8 FROM {} WHERE {} IS NOT NULL").format(column_ref, column_ref, column_ref, table_ref, column_ref))
                    mins, maxs, avg = cur.fetchone()
                    if mins is not None or maxs is not None or avg is not None:
                        numeric_summary = {"min": float(mins) if mins is not None else None, "max": float(maxs) if maxs is not None else None, "mean": float(avg) if avg is not None else None}
                profiles.append({
                    "name": column_name,
                    "dataType": data_type,
                    "nullCount": null_count,
                    "nullPercent": round(null_rate, 2),
                    "distinctCount": distinct_count,
                    "sampleTopValues": top_values,
                    "numericSummary": numeric_summary,
                })
            return {
                "table": table,
                "schema": schema,
                "rowCount": row_count,
                "generatedAt": datetime.utcnow().isoformat() + "Z",
                "columns": profiles,
            }
    finally:
        conn.close()

def main():
    args = parse_args()
    schema, table = normalise_table(args.table, args.schema)
    if args.sample_size <= 0 or args.top_k <= 0:
        raise ValueError("Sample size and top-k must be positive")
    profile = fetch_profile(schema, table, args.sample_size, args.top_k)
    json.dump(profile, sys.stdout, default=decimal_default)
    sys.stdout.write("\n")

if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(str(exc), file=sys.stderr)
        sys.exit(1)
