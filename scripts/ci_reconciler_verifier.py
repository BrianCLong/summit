import json
import statistics
import sys
import time

import requests

URL = "http://localhost:8080"
DATASET = sys.argv[1]  # path to debezium_topic_sample.json

def post(evt):
    r = requests.post(f"{URL}/reconcile/apply", json=evt, timeout=20)
    r.raise_for_status()
    return r.json()

def main():
    with open(DATASET) as f: evts = [json.loads(l) for l in f if l.strip()]
    lat = []
    for e in evts:
        t0 = time.perf_counter()
        post(e)
        lat.append((time.perf_counter() - t0) * 1000.0)
    med = statistics.median(lat)
    print(f"median_ms={med:.2f}")
    # Hard gate for perf (D) if you want it here:
    # assert med <= float(os.getenv("RECONCILE_MEDIAN_MS", "X"))
if __name__ == "__main__":
    main()
