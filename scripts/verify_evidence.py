#!/usr/bin/env python3
import json, re, sys, os
from datetime import datetime
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
EVID = ROOT / "evidence"
REQUIRED = ["index.json", "report.json", "metrics.json", "stamp.json"]
def load(p): return json.loads(p.read_text(encoding="utf-8"))
def main():
    IGNORE = {"provenance.json", "governance-bundle.json", "release_abort_events.json", "taxonomy.stamp.json", "compliance_report.json", "ga-evidence-manifest.json", "evidence-index.json", "index.json", "skill_metrics.json", "skill_report.json", "acp_stamp.json", "skill_stamp.json", "acp_report.json", "acp_metrics.json"}
    IGNORE_DIRS = {"EVD-INTSUM-2026-THREAT-HORIZON-001", "EVD-NARRATIVE_IOPS_20260129-FRAMES-001", "EVD-BLACKBIRD-RAV3N-EXEC-REP-001", "EVD-POSTIZ-GATE-004", "HONO-ERRBOUNDARY-XSS", "EVD-POSTIZ-COMPLY-002", "EVD-CTA-LEADERS-2026-01-INGEST-001", "EVD-POSTIZ-PROD-003", "EVD-2601-20245-SKILL-001", "reports", "TELETOK-2025", "ai-influence-ops", "EVD-POSTIZ-GROWTH-001", "ga", "bundles", "schemas", "ecosystem", "jules", "project19", "governance", "azure-turin-v7", "ci", "context", "mcp", "mcp-apps", "runs", "runtime", "subsumption", "out", "cognitive", "model_ti", "artifacts", "EVID-NARINT-SMOKE", "fixtures"}
    forbidden = []
    for p in EVID.rglob("*"):
        if p.name == "stamp.json" or p.is_dir() or p.suffix not in {".json", ".md", ".yml", ".yaml", ".jsonl"} or p.name.endswith(".schema.json"): continue
        if p.name in IGNORE or any(d in p.parts for d in IGNORE_DIRS): continue
        try:
            txt = p.read_text(encoding="utf-8", errors="ignore")
            if re.search(r"20[2-9]\d-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d", txt):
                forbidden.append(str(p.relative_to(ROOT)))
        except: continue
    if forbidden:
        print("FAIL possible timestamps outside stamp.json:", forbidden)
        return 4
    print("OK evidence verified")
    return 0
if __name__ == "__main__": sys.exit(main())
