from __future__ import annotations

import argparse
import hashlib
import json
import os
import resource
import sys
import time
from pathlib import Path
from typing import Any

from summit.evidence.writer import write_deterministic_json
from summit.rlvr.length_drift import detect_length_collapse, length_histogram
from summit.security.redaction import DEFAULT_NEVER_LOG_KEYS, redact_record

ALLOWED_KEYS = {"step", "response_len"}


def _sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def _hash_chain(lines: list[str]) -> str:
    current = "0" * 64
    for line in lines:
        line_bytes = line.rstrip("\n").encode("utf-8")
        current = _sha256_bytes(current.encode("utf-8") + line_bytes)
    return current


def _parse_json_line(line: str, *, allow_extra: bool) -> dict[str, Any]:
    try:
        record = json.loads(line)
    except json.JSONDecodeError as exc:
        raise ValueError(f"invalid JSONL line: {exc.msg}") from exc
    if not isinstance(record, dict):
        raise ValueError("JSONL records must be objects")
    keys = set(record.keys())
    if not allow_extra and not keys.issubset(ALLOWED_KEYS):
        extra = sorted(keys - ALLOWED_KEYS)
        raise ValueError(f"unexpected fields: {extra}")
    if "response_len" not in record:
        raise ValueError("response_len is required")
    if not isinstance(record["response_len"], int) or record["response_len"] < 0:
        raise ValueError("response_len must be a non-negative integer")
    if "step" in record and (not isinstance(record["step"], int) or record["step"] < 0):
        raise ValueError("step must be a non-negative integer")
    return record


def _load_events(
    path: Path,
    *,
    allow_extra: bool,
    redact: bool,
    never_log_keys: list[str],
) -> tuple[list[int], list[int], int]:
    redacted_fields = 0
    lengths: list[int] = []
    steps: list[int] = []

    with path.open("r", encoding="utf-8") as handle:
        for index, line in enumerate(handle):
            if not line.strip():
                continue
            record = _parse_json_line(line, allow_extra=allow_extra)
            if redact:
                redaction = redact_record(record, never_log_keys=never_log_keys)
                record = redaction.record
                redacted_fields += redaction.redacted_fields
            step = record.get("step", index)
            lengths.append(record["response_len"])
            steps.append(step)
    if not lengths:
        raise ValueError("no valid records found")
    return lengths, steps, redacted_fields


def _build_report(
    *,
    input_hash: str,
    lengths: list[int],
    steps: list[int],
    window: int,
    slope_threshold: float,
    drop_threshold: float,
    max_len: int | None,
    overlong_ratio_threshold: float,
    hash_chain: str | None,
    redacted_fields: int,
) -> tuple[dict[str, Any], dict[str, Any], dict[str, Any]]:
    result = detect_length_collapse(
        lengths,
        steps=steps,
        window=window,
        slope_threshold=slope_threshold,
        drop_threshold=drop_threshold,
        max_len=max_len,
        overlong_ratio_threshold=overlong_ratio_threshold,
    )

    report_id = f"EVID:lspo:length-report:{input_hash}"
    metrics_id = f"EVID:lspo:length-metrics:{input_hash}"
    stamp_id = f"EVID:lspo:length-stamp:{input_hash}"

    report = {
        "evidence_id": report_id,
        "input_hash": input_hash,
        "input_records": len(lengths),
        "lengths": {
            "mean": result.mean_length,
            "p50": result.p50,
            "p95": result.p95,
            "min": result.min_length,
            "max": result.max_length,
        },
        "trend": {
            "slope": result.slope,
            "drop_pct": result.drop_pct,
            "window": window,
            "collapse": result.collapse,
        },
        "policy": {
            "max_len": max_len,
            "overlong_ratio": result.overlong_ratio,
            "overlong_ratio_threshold": overlong_ratio_threshold,
            "overlong_flag": result.overlong_flag,
        },
        "histogram": length_histogram(lengths),
        "hash_chain": {
            "enabled": hash_chain is not None,
            "final": hash_chain,
            "algorithm": "sha256",
        },
        "redaction": {
            "applied": redacted_fields > 0,
            "redacted_fields": redacted_fields,
        },
        "evidence_ids": {
            "report": report_id,
            "metrics": metrics_id,
            "stamp": stamp_id,
        },
    }

    metrics = {
        "evidence_id": metrics_id,
        "metrics": {
            "length_mean": result.mean_length,
            "length_p50": result.p50,
            "length_p95": result.p95,
            "length_min": result.min_length,
            "length_max": result.max_length,
            "length_slope": result.slope,
            "length_drop_pct": result.drop_pct,
            "length_collapse": result.collapse,
            "overlong_ratio": result.overlong_ratio,
            "overlong_flag": result.overlong_flag,
        },
    }

    git_sha = os.getenv("GIT_SHA") or os.getenv("GITHUB_SHA") or "unknown"
    stamp = {
        "evidence_id": stamp_id,
        "git_sha": git_sha,
        "deterministic": True,
    }
    return report, metrics, stamp


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description="RLVR length report generator")
    parser.add_argument("--in", dest="input_path", required=True)
    parser.add_argument("--out", dest="output_dir", required=True)
    parser.add_argument("--window", type=int, default=10)
    parser.add_argument("--slope-threshold", type=float, default=-0.1)
    parser.add_argument("--drop-threshold", type=float, default=0.2)
    parser.add_argument("--max-len", type=int)
    parser.add_argument("--overlong-ratio-threshold", type=float, default=0.1)
    parser.add_argument("--hash-chain", action="store_true")
    parser.add_argument("--allow-extra", action="store_true")
    parser.add_argument("--redact", action="store_true")
    parser.add_argument(
        "--never-log",
        action="append",
        default=[],
        help="Additional never-log keys (repeatable)",
    )
    parser.add_argument("--precision", type=int, default=6)
    parser.add_argument(
        "--perf-out",
        help="Optional path to write perf.json with deterministic fields.",
    )
    args = parser.parse_args(argv[1:])

    input_path = Path(args.input_path)
    output_dir = Path(args.output_dir)

    if not input_path.exists():
        print(f"input not found: {input_path}", file=sys.stderr)
        return 2

    try:
        start_time = time.perf_counter()
        input_bytes = input_path.read_bytes()
        input_hash = _sha256_bytes(input_bytes)
        hash_chain = None
        if args.hash_chain:
            lines = input_path.read_text(encoding="utf-8").splitlines(True)
            hash_chain = _hash_chain(lines)
        never_log_keys = list(DEFAULT_NEVER_LOG_KEYS) + list(args.never_log)
        lengths, steps, redacted_fields = _load_events(
            input_path,
            allow_extra=args.allow_extra,
            redact=args.redact,
            never_log_keys=never_log_keys,
        )
        report, metrics, stamp = _build_report(
            input_hash=input_hash,
            lengths=lengths,
            steps=steps,
            window=args.window,
            slope_threshold=args.slope_threshold,
            drop_threshold=args.drop_threshold,
            max_len=args.max_len,
            overlong_ratio_threshold=args.overlong_ratio_threshold,
            hash_chain=hash_chain,
            redacted_fields=redacted_fields,
        )
    except ValueError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 1

    write_deterministic_json(output_dir / "length_report.json", report, precision=args.precision)
    write_deterministic_json(output_dir / "metrics.json", metrics, precision=args.precision)
    write_deterministic_json(output_dir / "stamp.json", stamp, precision=args.precision)
    if args.perf_out:
        runtime_ms = round((time.perf_counter() - start_time) * 1000)
        peak_rss_kb = resource.getrusage(resource.RUSAGE_SELF).ru_maxrss
        peak_rss_mb = round(peak_rss_kb / 1024)
        perf = {
            "input_bytes": len(input_bytes),
            "runtime_ms": runtime_ms,
            "peak_rss_mb": peak_rss_mb,
        }
        write_deterministic_json(Path(args.perf_out), perf, precision=args.precision)
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
