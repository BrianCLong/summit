#!/usr/bin/env python3
"""
Simple SLI/SLO error budget + burn-rate calculator.

Inputs:
  - Prometheus base URL via PROM_URL (optional)
  - SLI name and selectors (source, pipeline, env)

Behaviors:
  - Computes availability error budget and burn for given SLO target over time windows
  - Supports freshness/latency objectives by threshold comparison if provided

Note: This is a lightweight utility; in CI you can point to a snapshot Prometheus or pipe CSV.
"""
import json
import os
import sys
import urllib.parse
import urllib.request

PROM = os.getenv("PROM_URL", "http://localhost:9090")


def q(query):
    url = f"{PROM}/api/v1/query?" + urllib.parse.urlencode({"query": query})
    with urllib.request.urlopen(url, timeout=10) as r:
        data = json.load(r)
        if data.get("status") != "success":
            raise RuntimeError(f"prom query failed: {data}")
        return data["data"]["result"]


def burn_rate(slo_target, good_ratio):
    # Error budget = 1 - target; burn = (1 - good_ratio) / (1 - target)
    eb = max(1.0 - float(slo_target), 1e-9)
    burn = max((1.0 - float(good_ratio)) / eb, 0.0)
    return eb, burn


def main():
    if len(sys.argv) < 5:
        print("usage: sli_slo.py <sli> <target> <selector_json> <window>")
        print(
            'example: sli_slo.py availability 0.995 \'{"source":"crm","pipeline":"ingest","env":"prod"}\' 30m'
        )
        sys.exit(2)
    sli, target, selector_json, window = sys.argv[1:5]
    sel = json.loads(selector_json)
    labels = ",".join([f'{k}="{v}"' for k, v in sel.items()])

    if sli == "availability":
        query = f"avg_over_time(pipeline_uptime_ratio{{{labels}}}[{window}])"
        res = q(query)
        ratio = float(res[0]["value"][1]) if res else 0.0
        eb, br = burn_rate(float(target), ratio)
        print(
            json.dumps(
                {
                    "sli": sli,
                    "good_ratio": ratio,
                    "target": float(target),
                    "error_budget": eb,
                    "burn_rate": br,
                }
            )
        )
        return
    if sli == "freshness":
        # lower is better: objective is freshness_seconds < threshold (provided via target as seconds)
        thresh = float(target)
        # treat as proportion of samples under threshold
        query = f"sum_over_time((pipeline_freshness_seconds{{{labels}}} < {thresh})[{window}]) / count_over_time(pipeline_freshness_seconds{{{labels}}}[{window}])"
        res = q(query)
        ratio = float(res[0]["value"][1]) if res else 0.0
        eb, br = burn_rate(0.95, ratio)  # default 95%
        print(
            json.dumps(
                {
                    "sli": sli,
                    "good_ratio": ratio,
                    "objective": f"< {thresh}",
                    "error_budget": eb,
                    "burn_rate": br,
                }
            )
        )
        return
    if sli == "completeness":
        query = f"avg_over_time(pipeline_completeness_ratio{{{labels}}}[{window}])"
        res = q(query)
        ratio = float(res[0]["value"][1]) if res else 0.0
        eb, br = burn_rate(float(target), ratio)
        print(
            json.dumps(
                {
                    "sli": sli,
                    "good_ratio": ratio,
                    "target": float(target),
                    "error_budget": eb,
                    "burn_rate": br,
                }
            )
        )
        return
    if sli == "correctness":
        query = f"avg_over_time(pipeline_correctness_ratio{{{labels}}}[{window}])"
        res = q(query)
        ratio = float(res[0]["value"][1]) if res else 0.0
        eb, br = burn_rate(float(target), ratio)
        print(
            json.dumps(
                {
                    "sli": sli,
                    "good_ratio": ratio,
                    "target": float(target),
                    "error_budget": eb,
                    "burn_rate": br,
                }
            )
        )
        return
    if sli == "latency":
        # P95 over window; compare with threshold in target
        thresh = float(target)
        query = f"histogram_quantile(0.95, sum(rate(pipeline_latency_seconds_bucket{{{labels}}}[5m])) by (le))"
        res = q(query)
        p95 = float(res[0]["value"][1]) if res else 0.0
        good = 1.0 if p95 < thresh else 0.0
        eb, br = burn_rate(0.95, good)
        print(
            json.dumps(
                {
                    "sli": sli,
                    "p95": p95,
                    "objective": f"< {thresh}",
                    "error_budget": eb,
                    "burn_rate": br,
                }
            )
        )
        return

    raise SystemExit(f"unknown sli: {sli}")


if __name__ == "__main__":
    main()
