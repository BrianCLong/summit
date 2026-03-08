import collections
import glob
import json
import statistics
import sys

from tools.plan_heatmap import summarize

rows = summarize()
failures = []
BASELINE_ENTROPY = float(0)  # TODO: replace with stored baseline value
def entropy(freqs):
    import math
    s = sum(freqs)
    if s==0: return 0.0
    return -sum((f/s)*math.log((f/s)+1e-12) for f in freqs)
plan_entropy = entropy([r["new_plan_frequency"] for r in rows]) if rows else 0.0

for r in rows:
    if r["plan_consistency"] < 0.95:
        failures.append(f"Low consistency: {r['plan_consistency']:.3f} for: {r['query'][:120]}")
    if r["new_plan_frequency"] > 0.01:
        failures.append(f"High new plan freq: {r['new_plan_frequency']:.3f} for: {r['query'][:120]}")

if plan_entropy > BASELINE_ENTROPY * 1.10 and BASELINE_ENTROPY>0:
    failures.append(f"Plan entropy increased >10% vs baseline ({plan_entropy:.4f} > {BASELINE_ENTROPY*1.10:.4f})")

if failures:
    print("PLAN STABILITY GATE FAIL:")
    print("\n".join(failures))
    sys.exit(1)
else:
    print("Plan stability gate OK.")
