#!/usr/bin/env python3
import json, sys
from pathlib import Path
data = json.load(open(sys.argv[1])) if len(sys.argv)&gt;1 else json.load(sys.stdin)
lines = []
lines.append("### Bench (smoke)\n")
lines.append("| target | p95 (ms) | baseline p95 | Δ (%) | err | SLO p95 | result |")
lines.append("|---|---:|---:|---:|---:|---:|:--:|")
for t, r in data.items():
    cur = r["current"]; base = r.get("baseline", {}); rules = r["rules"]
    p95 = cur.get("p95"); b95 = base.get("p95")
    delta = "n/a"
    if p95 is not None and b95:
        delta = f"{((p95-b95)/b95*100):+.1f}"
    er = cur.get("error_rate", 0.0)
    ok = True
    if p95 is not None and p95 &gt; rules["p95_ms_max"]: ok = False
    if er is not None and er &gt; rules.get("error_rate_max", 1.0): ok = False
    icon = "✅" if ok else "❌"
    lines.append(f"| {t} | {p95 or 'n/a'} | {b95 or 'n/a'} | {delta} | {er:.3f} | {rules['p95_ms_max']} | {icon} |")
lines.append("\n_Artifacts: `sprint/benchmark/metrics/*`_")
print("\n".join(lines))