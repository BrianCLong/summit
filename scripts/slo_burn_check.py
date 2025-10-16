#!/usr/bin/env python3
import json
import os
import sys
import urllib.parse
import urllib.request

BUDGET_KEYS = [
    (
        "graphql_read_p95_ms",
        'histogram_quantile(0.95, sum by(le,job) (rate(http_request_duration_seconds_bucket{route=~"/graphql.*",job=~"api|gateway"}[5m]))) * 1000',
    ),
    (
        "graphql_write_p95_ms",
        'histogram_quantile(0.95, sum by(le,job) (rate(http_request_duration_seconds_bucket{route=~"/graphql.*",method="POST",job=~"api|gateway"}[5m]))) * 1000',
    ),
]


def q(prom, expr):
    url = f"{prom}/api/v1/query?{urllib.parse.urlencode({'query': expr})}"
    with urllib.request.urlopen(url, timeout=10) as r:
        j = json.load(r)
    if j.get("status") != "success":
        raise SystemExit(f"Prometheus error: {j}")
    res = j["data"]["result"]
    if not res:
        return None
    try:
        return float(res[0]["value"][1])
    except Exception:
        return None


if __name__ == "__main__":
    prom = os.environ.get("PROM_URL") or (len(sys.argv) > 2 and sys.argv[2])
    budget_path = (
        sys.argv[sys.argv.index("--budget") + 1]
        if "--budget" in sys.argv
        else ".maestro/ci_budget.json"
    )
    budget = json.load(open(budget_path))
    slos = budget.get("slos", {})
    critical = []
    for key, expr in BUDGET_KEYS:
        target = slos.get(key)
        if target is None:
            continue
        val = q(prom, expr)
        if val is None:
            print(f"WARN: no data for {key}")
            continue
        print(f"{key}: current={val:.0f}ms target={target}ms")
        if val > float(target):
            critical.append((key, val, target))
    if critical:
        for k, v, t in critical:
            print(f"CRIT {k}: {v:.0f}ms > {t}ms")
        sys.exit(2)
    print("SLO burn check: OK")
