import json
import os
import glob
from pathlib import Path
from collections import defaultdict

def summarize(sample_dir=".plan-samples"):
    # Structure: dict of query -> list of samples
    queries = defaultdict(list)

    sample_files = glob.glob(os.path.join(sample_dir, "*.jsonl"))
    for fpath in sample_files:
        with open(fpath, 'r', encoding='utf-8') as f:
            for line in f:
                if not line.strip(): continue
                try:
                    data = json.loads(line)
                    # Expected fields: query, plan_fingerprint, duration_ms
                    if "query" in data and "plan_fingerprint" in data:
                        queries[data["query"]].append(data)
                except json.JSONDecodeError:
                    continue

    results = []
    for query, samples in queries.items():
        total = len(samples)
        if total == 0: continue

        fingerprints = [s["plan_fingerprint"] for s in samples]
        durations = [s.get("duration_ms", 0) for s in samples]

        # Frequency count
        fp_counts = defaultdict(int)
        for fp in fingerprints:
            fp_counts[fp] += 1

        top_fp, top_count = max(fp_counts.items(), key=lambda x: x[1])

        plan_consistency = float(top_count) / total
        new_plan_frequency = 1.0 - plan_consistency

        # P50 duration
        durations.sort()
        p50_ms = durations[total // 2] if durations else 0

        results.append({
            "query": query,
            "plan_consistency": plan_consistency,
            "new_plan_frequency": new_plan_frequency,
            "top_fp": top_fp,
            "p50_ms": p50_ms,
            "total": total
        })

    return results

def main():
    rows = summarize()
    # Simple HTML generation
    html = "<html><body><h1>Plan Heatmap</h1><table border='1'><tr><th>Query</th><th>Consistency</th><th>New Plan Freq</th><th>P50 ms</th><th>Total</th></tr>"
    for r in rows:
        color = "green" if r["plan_consistency"] > 0.95 else "red"
        html += f"<tr><td>{r['query']}</td><td style='color:{color}'>{r['plan_consistency']:.2f}</td><td>{r['new_plan_frequency']:.2f}</td><td>{r['p50_ms']}</td><td>{r['total']}</td></tr>"
    html += "</table></body></html>"

    with open("plan-heatmap.html", "w", encoding='utf-8') as f:
        f.write(html)
    print("Wrote plan-heatmap.html")

if __name__ == "__main__":
    main()
