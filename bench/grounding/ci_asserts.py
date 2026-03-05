import json, sys, os
THRESH_DROP = -0.05   # fail if delta <= -0.05
MIN_PLAN = 95.0       # %

base_dir = os.path.dirname(__file__)
base_path = os.path.join(base_dir, "base.json")
results_path = os.path.join(base_dir, "results.json")

if not os.path.exists(base_path):
    print("No baseline found, skipping regression check.")
    sys.exit(0)

with open(base_path) as f: base = json.load(f)["summary"]
with open(results_path) as f: curr = json.load(f)["summary"]

def assert_delta(curr_v, base_v, name):
    delta = curr_v - base_v
    if delta <= THRESH_DROP:
        print(f"FAIL {name}: delta {delta:.3f} <= {THRESH_DROP}"); sys.exit(1)

assert_delta(curr["precision@k"]["hybrid"], base["precision@k"]["hybrid"], "precision@k(hybrid)")
assert_delta(curr["precision@k"]["graph_only"], base["precision@k"]["graph_only"], "precision@k(graph_only)")
for side in ["graph_only_pct","hybrid_pct"]:
    if curr["plan_consistency"][side] < MIN_PLAN:
        print(f"FAIL plan_consistency {side}: {curr['plan_consistency'][side]:.2f}% < {MIN_PLAN}%"); sys.exit(1)

print("OK")
