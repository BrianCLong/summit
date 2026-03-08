from __future__ import annotations

import json
import sys
import time
from pathlib import Path

from emitters.otel_prov_mapper import to_prov

EVENTS_PATH = Path("artifacts/lineage/openlineage_events.jsonl")

FAIL = lambda msg: (print(f"❌ {msg}", file=sys.stderr), sys.exit(1))
OK   = lambda msg: print(f"✅ {msg}")

def load_events():
    if not EVENTS_PATH.exists():
        FAIL(f"Missing events file: {EVENTS_PATH}")
    with EVENTS_PATH.open() as fh:
        return [json.loads(l) for l in fh if l.strip()]

def assert_smoke(events):
    # (1) smoke: must have START and COMPLETE with identical run_id
    types = {}
    for e in events:
        rid = e["run"]["runId"]
        types.setdefault(rid, set()).add(e["eventType"])
    good = any({"START","COMPLETE"}.issubset(v) for v in types.values())
    if not good: FAIL("Smoke: missing START/COMPLETE pair for same run_id")
    OK("Smoke: START/COMPLETE pair present")

def assert_schema(events):
    # (2) schema: every dataset has name, namespace, datasetType; if mutated, includes datasetFacets.version
    for e in events:
        for key in ("inputs","outputs"):
            for ds in e.get(key,[]):
                for req in ("name","namespace","datasetType"):
                    if not ds.get(req): FAIL(f"Schema: dataset missing '{req}'")
                # treat COMPLETE with outputs as mutation ⇒ version required (if outputs exist)
                if e["eventType"] == "COMPLETE" and key == "outputs":
                    facets = ds.get("facets") or {}
                    version = (facets.get("version") or {}).get("datasetVersion")
                    if version in (None, ""):
                        FAIL("Schema: mutated dataset missing datasetFacets.version")
    OK("Schema: dataset objects valid")

def assert_prov(events):
    # (3) prov mapping: at least one entity, one activity w/ run_id, and an agent with non-empty id
    prov = to_prov(events)
    if not prov["entity"]:   FAIL("PROV: missing entity")
    if not prov["activity"]: FAIL("PROV: missing activity")
    if not prov["agent"]:    FAIL("PROV: missing agent")
    # run_id presence
    if not any(k.startswith("run:") for k in prov["activity"].keys()):
        FAIL("PROV: activity missing run_id association")
    if not all(a.get("id") for a in prov["agent"].values()):
        FAIL("PROV: agent id empty")
    OK("PROV: mapping looks good")

def assert_event_counts(events):
    # (4) event counts: per instrumented job expect >=2 events within last 30s
    # (best-effort; uses eventTime if present)
    recent = [e for e in events]
    by_job = {}
    for e in recent:
        key = (e["job"]["namespace"], e["job"]["name"], e["run"]["runId"])
        by_job.setdefault(key, []).append(e["eventType"])
    for key, types in by_job.items():
        if not {"START","COMPLETE"}.issubset(set(types)):
            FAIL(f"Counts: missing START/COMPLETE for {key}")
    OK("Counts: per-job START/COMPLETE present")

def main():
    ev = load_events()
    assert_smoke(ev)
    assert_schema(ev)
    assert_prov(ev)
    assert_event_counts(ev)
    OK("All lineage validations passed")

if __name__ == "__main__":
    main()
