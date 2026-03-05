#!/usr/bin/env python3
"""Deterministic replay harness for WebMCP transcripts."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
import sys
import time

REPO_ROOT = Path(__file__).resolve().parents[2]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from adapters.webmcp.ingest import WebMCPSession
from policy.browser_tool_gate import evaluate_browser_session


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True)
    parser.add_argument("--out-dir", required=True)
    parser.add_argument("--allow-origin", action="append", default=[])
    args = parser.parse_args()

    started = time.perf_counter()
    transcript = json.loads(Path(args.input).read_text(encoding="utf-8"))
    evidence = WebMCPSession(transcript=transcript).to_evidence()
    decision = evaluate_browser_session(evidence, set(args.allow_origin))
    latency_ms = round((time.perf_counter() - started) * 1000, 3)

    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    report = {
        "name": "webmcp_replay",
        "status": "pass" if decision["allow"] else "fail",
        "evidence_id": evidence["evidence_id"],
        "policy_reason": decision["reason"],
    }
    metrics = {
        "normalization_latency_ms": latency_ms,
        "action_count": len(evidence["actions"]),
    }
    stamp = {
        "schema": "webmcp-replay/v1",
        "deterministic": True,
    }

    (out_dir / "report.json").write_text(json.dumps(report, sort_keys=True, indent=2) + "\n", encoding="utf-8")
    (out_dir / "metrics.json").write_text(json.dumps(metrics, sort_keys=True, indent=2) + "\n", encoding="utf-8")
    (out_dir / "stamp.json").write_text(json.dumps(stamp, sort_keys=True, indent=2) + "\n", encoding="utf-8")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
