import json, os, sys, math
from pathlib import Path
from tools.plan_heatmap import summarize

BASELINE_PATH = Path(os.getenv("PLAN_BASELINE_PATH", "docs/ga/baselines/plan_baseline.json"))

# Default thresholds (override via env if desired)
MIN_CONSISTENCY = float(os.getenv("PLAN_MIN_CONSISTENCY", "0.95"))
MAX_NEW_PLAN_FREQ = float(os.getenv("PLAN_MAX_NEW_PLAN_FREQUENCY", "0.01"))
MAX_ENTROPY_INCREASE = float(os.getenv("PLAN_MAX_ENTROPY_INCREASE", "0.10"))  # +10%

def entropy(vals):
    # vals are frequencies in [0..1], stable across comparisons
    # Use a bounded entropy proxy: H = -sum(p log p) with eps
    eps = 1e-12
    s = sum(vals)
    if s <= 0: return 0.0
    ps = [(v/s) for v in vals]
    return -sum(p * math.log(p + eps) for p in ps)

def load_baseline():
    if not BASELINE_PATH.exists():
        return {"baseline_entropy": 0.0, "queries": {}, "established_on_commit": "UNSET"}
    return json.loads(BASELINE_PATH.read_text(encoding="utf-8"))

def main():
    rows = summarize()
    base = load_baseline()

    failures = []
    warnings = []

    # Aggregate entropy across queries (proxy)
    current_entropy = entropy([r["new_plan_frequency"] for r in rows]) if rows else 0.0
    baseline_entropy = float(base.get("baseline_entropy", 0.0))

    # Per-query checks
    for r in rows:
        if r["plan_consistency"] < MIN_CONSISTENCY:
            failures.append(
                f"plan_consistency {r['plan_consistency']:.3f} < {MIN_CONSISTENCY:.3f} :: {r['query'][:140]}"
            )
        if r["new_plan_frequency"] > MAX_NEW_PLAN_FREQ:
            failures.append(
                f"new_plan_frequency {r['new_plan_frequency']:.3f} > {MAX_NEW_PLAN_FREQ:.3f} :: {r['query'][:140]}"
            )

    # Entropy check vs baseline (only enforce if baseline is established)
    if baseline_entropy > 0:
        allowed = baseline_entropy * (1.0 + MAX_ENTROPY_INCREASE)
        if current_entropy > allowed:
            failures.append(
                f"plan_entropy {current_entropy:.6f} > allowed {allowed:.6f} (baseline {baseline_entropy:.6f})"
            )
    else:
        warnings.append("Baseline entropy is 0/unset; entropy drift check not enforced yet.")

    print("PLAN STABILITY REPORT")
    print(f"- queries_observed: {len(rows)}")
    print(f"- entropy_current: {current_entropy:.6f}")
    print(f"- entropy_baseline: {baseline_entropy:.6f}")
    if warnings:
        print("\nWARNINGS:")
        for w in warnings: print(f"- {w}")

    if failures:
        print("\nFAILURES:")
        for f in failures: print(f"- {f}")
        sys.exit(1)

    print("\nPlan stability gate OK.")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
