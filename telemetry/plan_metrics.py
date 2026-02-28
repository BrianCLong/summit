from pathlib import Path
import sys, os
sys.path.append(os.path.join(os.path.dirname(__file__), ".."))
from tools.plan_heatmap import summarize

OUT = Path("artifacts/plan/plan_metrics.prom")
OUT.parent.mkdir(parents=True, exist_ok=True)

def sanitize_label(s: str) -> str:
    # keep it simple; you can hash queries instead
    return str(abs(hash(s)))

def main():
    rows = summarize()

    lines = []
    lines.append("# HELP summit_plan_consistency Top plan fingerprint consistency per query")
    lines.append("# TYPE summit_plan_consistency gauge")
    lines.append("# HELP summit_new_plan_frequency New/alternate plan frequency per query")
    lines.append("# TYPE summit_new_plan_frequency gauge")

    for r in rows:
        qid = sanitize_label(r["query"])
        lines.append(f'summit_plan_consistency{{query_id="{qid}"}} {r["plan_consistency"]:.6f}')
        lines.append(f'summit_new_plan_frequency{{query_id="{qid}"}} {r["new_plan_frequency"]:.6f}')

    OUT.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"Wrote {OUT}")

if __name__ == "__main__":
    main()
