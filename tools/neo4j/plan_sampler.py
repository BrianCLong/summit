#!/usr/bin/env python3
import datetime
import hashlib
import json
import os
import re
import sys
from typing import Any, Dict, List

from neo4j import GraphDatabase

NEO4J_URI = os.environ.get("NEO4J_URI", "bolt://localhost:7687") or "bolt://localhost:7687"
NEO4J_USER = os.environ.get("NEO4J_USER", "neo4j")
NEO4J_PASS = os.environ.get("NEO4J_PASS", "password")
OUTPUT = os.environ.get("PLAN_FINGERPRINT_OUT", "plan-fingerprints.jsonl")
SEEDS_FILE = os.environ.get("PLAN_SEEDS_FILE", "tools/neo4j/seed_queries.txt")

# Strip volatile fields from EXPLAIN plan dictionaries
VOLATILE_KEYS = {
    "profilingInformation","time","dbHits","pageCacheHits","pageCacheMisses",
    "rows","identifiers","arguments","id","address","planner","runtime",
    "version","cost","operatorId"
}

def load_seeds(path:str)->list[str]:
    if not os.path.exists(path):
        print(f"[plan-sampler] No seeds file found at {path}", file=sys.stderr)
        return []
    with open(path) as f:
        return [q.strip() for q in f.read().split("\n\n") if q.strip()]

def normalize_plan(node:dict[str,Any])->dict[str,Any]:
    if node is None:
        return {}
    # keep 'name' and children; drop volatile stuff; scrub numbers/addresses in texts
    keep = {"name": node.get("name")}
    # recursively normalize children if present under known keys
    children = []
    for k in ("children","args","children?"):
        if isinstance(node.get(k), list):
            for c in node[k]:
                children.append(normalize_plan(c))
    if children:
        keep["children"] = children
    # sanitize any residual string fields to remove digits/addresses
    for k,v in list(node.items()):
        if k in VOLATILE_KEYS:
            continue
        if isinstance(v, str):
            s = re.sub(r"0x[0-9a-fA-F]+","<addr>", v)
            s = re.sub(r"\b\d+\b","<n>", s)
            keep[k] = s
        elif isinstance(v, (int,float,bool)) or v is None:
            # omit scalars to reduce churn unless it's 'name'
            pass
        elif isinstance(v, dict):
            # shallow scrub for deterministic shape
            keep[k] = {"_keys": sorted([kk for kk in v.keys() if kk not in VOLATILE_KEYS])}
    return keep

def stable_fingerprint(obj:dict[str,Any])->str:
    payload = json.dumps(obj, sort_keys=True, separators=(",",":"))
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()

def explain_query(tx, q:str)->dict[str,Any]:
    # Use CYPHER runtime default; EXPLAIN returns plan in summary
    res = tx.run("EXPLAIN " + q)
    _ = list(res)  # exhaust
    return res.consume().plan._plan  # low-level dict-like plan tree

def main():
    seeds = load_seeds(SEEDS_FILE)
    if not seeds:
        print("[plan-sampler] No seed queries; exiting 0.")
        return  # no-op
    driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASS))
    ts = datetime.datetime.utcnow().isoformat() + "Z"
    samples = 0
    with driver, open(OUTPUT, "a") as out:
        with driver.session() as s:
            for q in seeds:
                try:
                    plan = s.execute_read(explain_query, q)
                    norm = normalize_plan(plan)
                    fp = stable_fingerprint(norm)
                    record = {
                        "timestamp": ts,
                        "query": q,
                        "fingerprint": fp,
                        "normalized_plan": norm,
                        "neo4j_uri": NEO4J_URI,
                    }
                    out.write(json.dumps(record, separators=(",",":")) + "\n")
                    samples += 1
                except Exception as e:
                    err = {"timestamp": ts, "query": q, "error": str(e), "neo4j_uri": NEO4J_URI}
                    out.write(json.dumps(err, separators=(",",":")) + "\n")
                    print(f"[plan-sampler] ERROR {e}", file=sys.stderr)
    print(f"[plan-sampler] wrote {samples} samples to {OUTPUT}")

if __name__ == "__main__":
    main()
