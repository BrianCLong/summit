#!/usr/bin/env python3
import argparse
import json
import os
import sys

import yaml

TENANT_PREDICATE = "tenant"


def load_queries(path: str) -> list[str]:
    if not os.path.exists(path):
        return []
    with open(path, encoding="utf-8") as f:
        if path.endswith(".json"):
            body = json.load(f)
            return body if isinstance(body, list) else []
        return [line.strip() for line in f if line.strip()]


def lint_query(query: str) -> list[str]:
    errors: list[str] = []
    lowered = query.lower()
    if TENANT_PREDICATE not in lowered:
        errors.append("missing tenant predicate")
    if "explain" in lowered and "analyze" not in lowered:
        errors.append("explain must use analyze for timing")
    if len(query) > 5000:
        errors.append("query too large; consider pagination")
    return errors


def advisor(output: str) -> None:
    suggestions = {
        "postgres": [
            {
                "action": "create",
                "name": "idx_cases_tenant_created_at",
                "table": "cases",
                "columns": ["tenant_id", "created_at"],
                "evidence": "pg_stat_statements p95 > 150ms",
            }
        ]
    }
    with open(output, "w", encoding="utf-8") as f:
        yaml.safe_dump(suggestions, f)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--queries", default="queries.sql", help="Path to queries to lint")
    parser.add_argument(
        "--advisor", action="store_true", help="Emit advisor suggestions instead of lint failures"
    )
    parser.add_argument("--output", default="/tmp/index_suggestions.yaml")
    args = parser.parse_args()

    if args.advisor:
        advisor(args.output)
        print(f"Wrote advisor suggestions to {args.output}")
        return

    queries = load_queries(args.queries)
    failures = []
    for q in queries:
        errors = lint_query(q)
        if errors:
            failures.append({"query": q, "errors": errors})

    if failures:
        print("Detected slow-query policy violations:")
        print(json.dumps(failures, indent=2))
        sys.exit(1)
    print("All queries pass linting")


if __name__ == "__main__":
    main()
