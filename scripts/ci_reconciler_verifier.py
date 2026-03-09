import json
import statistics
import sys
import time

import requests

import argparse
import os

URL = "http://localhost:8080"

def post(evt, dry_run=False):
    if dry_run:
        print(f"[DRY RUN] Would post event: {evt}")
        return {}
    r = requests.post(f"{URL}/reconcile/apply", json=evt, timeout=20)
    r.raise_for_status()
    return r.json()

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("dataset", help="path to dataset (e.g. debezium_topic_sample.json)")
    parser.add_argument("--dry-run", action="store_true", help="dry run mode")
    args = parser.parse_args()

    dry_run = args.dry_run or os.environ.get('DRY_RUN') == 'true'

    with open(args.dataset) as f: evts = [json.loads(l) for l in f if l.strip()]
    lat = []
    for e in evts:
        t0 = time.perf_counter()
        post(e, dry_run=dry_run)
        lat.append((time.perf_counter() - t0) * 1000.0)
    med = statistics.median(lat)
    print(f"median_ms={med:.2f}")
    # Hard gate for perf (D) if you want it here:
    # assert med <= float(os.getenv("RECONCILE_MEDIAN_MS", "X"))
if __name__ == "__main__":
    main()
