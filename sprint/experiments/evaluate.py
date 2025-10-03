#!/usr/bin/env python3
import json, sys, time, os, yaml
from pathlib import Path

def load_jsonl(path):
    if not Path(path).exists(): return []
    return [json.loads(l) for l in open(path) if l.strip().startswith("{")]

def summarize(target):
    rows = load_jsonl(f"sprint/benchmark/metrics/{target}.jsonl")
    if not rows: return {"p95": None, "error_rate": 0.0}
    # average of recent p95s to smooth noise
    last = rows[-min(20, len(rows)):]
    p95s = [r.get("latency_ms_p95") or r.get("p95") for r in last if (r.get("latency_ms_p95") or r.get("p95"))]
    err  = [r.get("error_rate", 0.0) for r in last]
    p95  = sum(p95s)/len(p95s) if p95s else None
    er   = sum(err)/len(err) if err else 0.0
    return {"p95": p95, "error_rate": er}

def main():
    slo = yaml.safe_load(open("sprint/benchmark/slo.yaml"))
    base_path = slo.get("baseline_path", "sprint/benchmark/baseline.json")
    baseline = json.load(open(base_path)) if Path(base_path).exists() else {}
    results, fail = {}, False
    for t, rules in slo["targets"].items():
        cur  = summarize(t)
        base = baseline.get(t, {})
        results[t] = {"current": cur, "baseline": base, "rules": rules}
        if cur["p95"] is not None and cur["p95"] > rules["p95_ms_max"]: fail = True
        if cur["error_rate"] is not None and cur["error_rate"] > rules.get("error_rate_max", 1.0): fail = True
        if base.get("p95") and cur["p95"] and (cur["p95"] - base["p95"]) > base["p95"]*0.10: fail = True
    print(json.dumps(results, indent=2))
    if os.environ.get("WRITE_BASELINE") == "1":
        out = {t: results[t]["current"] for t in slo["targets"].keys()}
        Path(base_path).parent.mkdir(parents=True, exist_ok=True)
        json.dump(out, open(base_path,"w"), indent=2)
    
    # --- GitHub step summary (nice PR UI) ---
    summary_lines = ["| target | p95 (ms) | err | p95 SLO | result |",
                     "|---|---:|---:|---:|:--:|"]
    for t, r in results.items():
        cur = r["current"]; rules = r["rules"]; ok = True
        p95 = cur["p95"]; er = cur["error_rate"]
        if p95 is not None and p95 > rules["p95_ms_max"]: ok = False
        if er is not None and er > rules.get("error_rate_max", 1.0): ok = False
        icon = "✅" if ok else "❌"
        summary_lines.append(f"| {t} | {p95 or 'n/a'} | {er or 0:.3f} | {rules['p95_ms_max']} | {icon} |")
    summary = "\n".join(summary_lines) + "\n"
    if os.getenv("GITHUB_STEP_SUMMARY"):
        with open(os.getenv("GITHUB_STEP_SUMMARY"), "a") as fh: fh.write("### SLO Check\n\n" + summary)
    print(summary)
    
    sys.exit(1 if fail else 0)

if __name__ == "__main__": main()