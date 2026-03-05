# tools/plan_heatmap.py
import collections
import glob
import html
import json
import statistics
import sys


def load_samples(pattern=".plan-samples/samples-*.jsonl"):
    for p in glob.glob(pattern):
        with open(p, encoding="utf-8") as f:
            for line in f:
                yield json.loads(line)

def summarize():
    by_q = collections.defaultdict(list)
    for s in load_samples():
        key = s["query"]
        by_q[key].append(s)
    out = []
    for q, arr in by_q.items():
        fps = [a["fp"] for a in arr]
        total = len(arr)
        top_fp, top_count = collections.Counter(fps).most_common(1)[0]
        consistency = top_count/total if total else 1.0
        new_plan_freq = 1 - consistency
        p50 = statistics.median(a["latency_ms"] for a in arr if a.get("latency_ms") is not None)
        out.append({"query": q, "total": total, "top_fp": top_fp,
                    "plan_consistency": consistency, "new_plan_frequency": new_plan_freq,
                    "p50_ms": p50})
    return sorted(out, key=lambda x: (x["plan_consistency"], -x["total"]))

def ascii_heatbar(consistency):
    # 20-char bar; green-ish = '#', drift = '.'
    filled = int(round(consistency*20))
    return "#"*filled + "."*(20-filled)

def write_ascii(rows):
    print("\nPLAN FINGERPRINT STABILITY\n")
    for r in rows[:50]:
        print(f"{ascii_heatbar(r['plan_consistency'])}  {r['plan_consistency']*100:5.1f}%  p50={int(r['p50_ms'])}ms")
        print(f"↳ {r['query'][:100]}…")
    print()

def write_html(rows, path="plan-heatmap.html"):
    # minimalist single-file HTML with inline SVG
    bars = []
    for i,r in enumerate(rows[:200]):
        w = int(r["plan_consistency"]*600)
        color = "#2e7d32" if r["plan_consistency"] >= 0.95 else "#ef6c00" if r["plan_consistency"]>=0.9 else "#c62828"
        label = html.escape(r["query"][:120])
        bars.append(f'<g transform="translate(0,{i*22})">'
                    f'<rect x="0" y="0" width="{w}" height="18" fill="{color}"></rect>'
                    f'<text x="{w+6}" y="14" font-family="monospace" font-size="12">{r["plan_consistency"]*100:.1f}% · p50 {int(r["p50_ms"])}ms · {label}</text>'
                    f'</g>')
    svg = f'<svg width="1200" height="{max(240,len(bars)*22)}" xmlns="http://www.w3.org/2000/svg">{"".join(bars)}</svg>'
    html_doc = f'<!doctype html><meta charset="utf-8"><title>Plan Heatmap</title><body>{svg}</body>'
    with open(path, "w", encoding="utf-8") as f:
        f.write(html_doc)

if __name__ == "__main__":
    rows = summarize()
    write_ascii(rows)
    write_html(rows)
