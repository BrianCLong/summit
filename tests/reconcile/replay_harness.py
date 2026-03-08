import hashlib
import json
import random
import time
from typing import Any, Dict, List, Tuple

import requests

# ---- Domain helpers --------------------------------------------------------

def event_lsn(e: dict[str, Any]) -> tuple[int, int]:
    # PostgreSQL LSN as (hi, lo) or parse "segment/offset" -> comparable tuple
    src = e.get("source", {})
    lsn = src.get("lsn") or src.get("lsn_hi_lo")
    if isinstance(lsn, str) and "/" in lsn:
        seg, off = lsn.split("/")
        return (int(seg, 16), int(off, 16))
    if isinstance(lsn, int):
        return (lsn >> 32, lsn & 0xFFFFFFFF)
    return (0, 0)

def is_tombstone(e: dict[str, Any]) -> bool:
    # Debezium tombstone: record with key only and null value (here normalized as {"op":"t"})
    # Your recorder should normalize tombstones as {"op":"t"} if value null.
    return e.get("op") == "t"

def stable_hash(obj: Any) -> str:
    return hashlib.sha256(json.dumps(obj, sort_keys=True, separators=(",", ":")).encode()).hexdigest()

# ---- Reconciler IO ---------------------------------------------------------

class ReconcilerClient:
    def __init__(self, base_url: str):
        self.base_url = base_url.rstrip("/")

    def apply(self, evt: dict[str, Any]) -> dict[str, Any]:
        # POST one event; reconciler must enforce "only newer LSN mutates"
        r = requests.post(f"{self.base_url}/reconcile/apply", json=evt, timeout=30)
        r.raise_for_status()
        return r.json()

    def graph_digest(self) -> dict[str, Any]:
        # Returns {"final_graph_state_hash": "...", "node_count": N, "pk_digest": "..."} for parity checks
        r = requests.get(f"{self.base_url}/reconcile/graph_digest", timeout=30)
        r.raise_for_status()
        return r.json()

# ---- Replay engine ---------------------------------------------------------

def load_topic(path: str) -> list[dict[str, Any]]:
    with open(path, encoding="utf-8") as f:
        return [json.loads(line) for line in f if line.strip()]

def randomized_orders(events: list[dict[str, Any]], runs: int, seed: int) -> list[list[dict[str, Any]]]:
    rnd = random.Random(seed)
    orders = []
    for i in range(runs):
        order = events[:]  # copy
        rnd.shuffle(order)
        # Optionally inject tombstone-first or delete-before-update edge cases
        orders.append(order)
    return orders

def run_replay(reconciler: ReconcilerClient, events: list[dict[str, Any]]) -> dict[str, Any]:
    noop, mutated = 0, 0
    for e in events:
        if is_tombstone(e):
            # your reconciler should interpret this as "compact/delete key"
            pass
        res = reconciler.apply(e)
        # Reconciler responds with {"applied": True/False, "reason": "..."}
        if res.get("applied"):
            mutated += 1
        else:
            noop += 1
    digest = reconciler.graph_digest()
    digest["noop_rate"] = noop / max(1, (noop + mutated))
    return digest

def replay_suite(dataset_path: str, base_url: str, runs: int = 1000, seed: int = 42):
    events = load_topic(dataset_path)
    client = ReconcilerClient(base_url)
    results = []
    for order in randomized_orders(events, runs, seed):
        results.append(run_replay(client, order))
    # Determinism: identical final hashes
    hashes = {r["final_graph_state_hash"] for r in results}
    return results, hashes
