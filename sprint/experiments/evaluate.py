#!/usr/bin/env python3
import json, sys, glob, statistics, argparse, os, yaml
from pathlib import Path

def load_slo(path):
    with open(path) as f: return yaml.safe_load(f)

def load_jsonl(path):
    vals = []
    if not Path(path).exists(): return vals
    for line in open(path):
        try: vals.append(json.loads(line))
        except: pass
    return vals

def p95(vals): 
    if not vals: return None
    vals = sorted(vals); i = int(round(0.95*(len(vals)-1)))
    return vals[i]

def summarize(target):
    # gather last run stats from jsonl
    p = Path(f"sprint/benchmark/metrics/{target}.jsonl")
    rows = load_jsonl(p)
    lat = []
    errors = 0; total = 0
    for r in rows[-50:]: # last 50 samples across runs
        for k in ["latency_ms_p95","latency_ms"]:
            if k in r: lat.append(r[k])
        if "error_rate" in r: errors += r["error_rate"]; total += 1
    return {
        "p95": (sum(lat)/len(lat)) if lat else None,
        "error_rate": (errors/total) if total else 0.0
    }

def regression_guard(cur, base, max_reg_pct=0.10):
    if cur is None or base is None: return False
    return (cur - base) > (base * max_reg_pct)

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--slo", default="sprint/benchmark/slo.yaml")
    ap.add_argument("--write-baseline", action="store_true")
    args = ap.parse_args()

    slo = load_slo(args.slo)
    baseline_path = slo.get("baseline_path", "sprint/benchmark/baseline.json")
    baseline = {}
    if Path(baseline_path).exists():
        baseline = json.load(open(baseline_path))

    targets = slo["targets"]
    results = {}
    fail = False

    for t, rules in targets.items():
        cur = summarize(t)
        base = baseline.get(t, {})
        results[t] = {"current": cur, "baseline": base, "rules": rules}

        # hard SLOs
        if cur["p95"] is not None and cur["p95"] > rules["p95_ms_max"]:
            fail = True
        if cur["error_rate"] is not None and cur["error_rate"] > rules.get("error_rate_max", 1):
            fail = True

        # soft regression guard (10% default)
        if base.get("p95") and regression_guard(cur["p95"], base["p95"]):
            fail = True

    if args.write_baseline:
        out = { t: {"p95": results[t]["current"]["p95"], "error_rate": results[t]["current"]["error_rate"]} for t in targets }
        Path(baseline_path).parent.mkdir(parents=True, exist_ok=True)
        json.dump(out, open(baseline_path, "w"), indent=2)

    print(json.dumps(results, indent=2))
    sys.exit(1 if fail else 0)

if __name__ == "__main__": main()