#!/usr/bin/env python3
import json, glob, collections, datetime as dt
tot=collections.defaultdict(float)
for p in glob.glob("logs/litellm-*.jsonl"):
  for line in open(p):
    try:
      j=json.loads(line); tot[j.get("model","unknown")]+=float(j.get("response_cost",0))
    except: pass
print("# Daily Cost by Model\n")
for m,v in sorted(tot.items(), key=lambda x:-x[1]):
  print(f"- {m}: ${v:.4f}")
print(f"\n_As of {dt.date.today()} _\n")
