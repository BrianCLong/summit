#!/usr/bin/env python3
import json
import math
import os
import sys

# Input: JSON array of plan summaries, each with fields:
# { "query_hash": "...", "db_hits": 123, "rows": 456, "operators": [{"type":"NodeIndexSeek","db_hits":...}, ...] }
# Output: SVG heatmap by operator type (rows) vs query_hash (cols) using log-scaled db_hits.

def log1p(x): return math.log(1.0 + max(0.0, float(x)))

def main():
  if len(sys.argv) < 3:
    print("usage: plan_heatmap.py <in_plan_summaries.json> <out_dir>", file=sys.stderr)
    return 2
  in_path, out_dir = sys.argv[1], sys.argv[2]
  os.makedirs(out_dir, exist_ok=True)

  plans = json.load(open(in_path, encoding="utf-8"))
  # stable ordering
  plans = sorted(plans, key=lambda p: (p.get("query_hash",""), p.get("db_hits",0), p.get("rows",0)))

  op_types = set()
  for p in plans:
    for op in p.get("operators", []):
      op_types.add(op.get("type","UNKNOWN"))
  op_types = sorted(op_types)

  qhashes = [p.get("query_hash","unknown") for p in plans]
  qhashes = sorted(set(qhashes))

  # matrix[op_type][qhash] = sum log(db_hits)
  matrix = {op: {qh: 0.0 for qh in qhashes} for op in op_types}
  top = []

  for p in plans:
    qh = p.get("query_hash","unknown")
    db_hits = float(p.get("db_hits", 0))
    rows = float(p.get("rows", 0))
    top.append({"query_hash": qh, "db_hits": db_hits, "rows": rows})
    for op in p.get("operators", []):
      typ = op.get("type","UNKNOWN")
      matrix[typ][qh] += log1p(op.get("db_hits", 0))

  top = sorted(top, key=lambda x: (-x["db_hits"], -x["rows"], x["query_hash"]))[:25]

  # write matrix json
  out_matrix = {
    "query_hashes": qhashes,
    "operator_types": op_types,
    "values": [[matrix[op][qh] for qh in qhashes] for op in op_types]
  }
  with open(os.path.join(out_dir, "heatmap.json"), "w", encoding="utf-8") as f:
    json.dump(out_matrix, f, indent=2)
    f.write("\n")

  with open(os.path.join(out_dir, "topk.json"), "w", encoding="utf-8") as f:
    json.dump({"top": top}, f, indent=2)
    f.write("\n")

  # render simple SVG
  cell = 14
  pad = 120
  w = pad + cell * len(qhashes) + 20
  h = pad + cell * len(op_types) + 20
  maxv = max((v for row in out_matrix["values"] for v in row), default=1.0)

  def color(v):
    # grayscale, deterministic, no style dependencies
    t = 0.0 if maxv == 0 else (v / maxv)
    c = int(255 * (1.0 - min(1.0, max(0.0, t))))
    return f"rgb({c},{c},{c})"

  svg = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}">']
  svg.append('<rect x="0" y="0" width="100%" height="100%" fill="white"/>')

  # labels
  for i, qh in enumerate(qhashes):
    x = pad + i * cell + 2
    svg.append(f'<text x="{x}" y="{pad-12}" font-size="8" transform="rotate(45 {x},{pad-12})">{qh[:10]}</text>')
  for j, op in enumerate(op_types):
    y = pad + j * cell + 10
    svg.append(f'<text x="4" y="{y}" font-size="10">{op}</text>')

  # cells
  for j, op in enumerate(op_types):
    for i, qh in enumerate(qhashes):
      v = matrix[op][qh]
      x = pad + i * cell
      y = pad + j * cell
      svg.append(f'<rect x="{x}" y="{y}" width="{cell}" height="{cell}" fill="{color(v)}" stroke="white" stroke-width="1"/>')

  svg.append("</svg>")
  with open(os.path.join(out_dir, "heatmap.svg"), "w", encoding="utf-8") as f:
    f.write("\n".join(svg) + "\n")

  return 0

if __name__ == "__main__":
  raise SystemExit(main())
