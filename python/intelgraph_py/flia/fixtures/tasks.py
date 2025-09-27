"""Deterministic task handlers for executing FLIA playbooks in tests."""

from __future__ import annotations

from typing import Any, Dict


def run_pytest(target: str) -> Dict[str, Any]:
    return {
        "status": "passed",
        "runner": "pytest",
        "target": target,
        "summary": f"Pytest suite executed for {target}",
    }


def run_dbt(model: str) -> Dict[str, Any]:
    return {
        "status": "passed",
        "runner": "dbt",
        "model": model,
        "rows": 1280,
    }


def backfill_pipeline(pipeline: str) -> Dict[str, Any]:
    return {
        "status": "completed",
        "pipeline": pipeline,
        "rows_processed": 5421,
    }


def invalidate_cache(cache_key: str) -> Dict[str, Any]:
    return {
        "status": "invalidated",
        "cache_key": cache_key,
    }


HANDLERS = {
    "run_pytest": run_pytest,
    "run_dbt": run_dbt,
    "backfill_pipeline": backfill_pipeline,
    "invalidate_cache": invalidate_cache,
}
