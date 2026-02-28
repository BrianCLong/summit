import json, hashlib
from pathlib import Path
import sys, os
sys.path.append(os.path.join(os.path.dirname(__file__), ".."))
from tools.plan_heatmap import summarize

OUT_DIR = Path("artifacts/plan")
OUT_DIR.mkdir(parents=True, exist_ok=True)

def sha256_bytes(b: bytes) -> str:
    return hashlib.sha256(b).hexdigest()

def main():
    rows = summarize()
    doc = {
        "schema": "summit.plan_stability.report.v1",
        "queries_observed": len(rows),
        "items": [
            {
                "query": r["query"],
                "top_fp": r["top_fp"],
                "plan_consistency": round(r["plan_consistency"], 6),
                "new_plan_frequency": round(r["new_plan_frequency"], 6),
                "p50_ms": int(r["p50_ms"]),
                "total_samples": int(r["total"])
            }
            for r in rows
        ],
    }
    b = json.dumps(doc, separators=(",", ":"), sort_keys=True).encode("utf-8")
    (OUT_DIR / "plan-report.json").write_bytes(b)
    (OUT_DIR / "plan-report.sha256").write_text(sha256_bytes(b) + "\n", encoding="utf-8")
    print("Wrote artifacts/plan/plan-report.json (+ sha256)")

if __name__ == "__main__":
    main()
