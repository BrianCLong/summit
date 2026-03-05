#!/usr/bin/env python3
import json
import sys
from collections import defaultdict, namedtuple
from typing import Dict, List, Optional, Tuple

Event = namedtuple("Event", ["pk", "lsn", "op", "ts_ms", "raw"])

def _extract_pk(payload: dict) -> tuple:
    key_obj = payload.get("key") or {}
    if isinstance(key_obj, dict) and key_obj:
        return tuple((k, key_obj[k]) for k in sorted(key_obj.keys()))
    val = payload.get("value") or {}
    after = (val.get("after") or {}) if isinstance(val.get("after"), dict) else {}
    before = (val.get("before") or {}) if isinstance(val.get("before"), dict) else {}
    for candidate in (after, before):
        if candidate:
            if "id" in candidate:
                return (("id", candidate["id"]),)
            return tuple(sorted(candidate.items()))[:2]
    return (("unknown", None),)

def _extract_meta(payload: dict) -> tuple[Optional[int], Optional[int], Optional[str]]:
    val = payload.get("value") or {}
    src = val.get("source") or {}
    lsn = src.get("lsn")
    ts_ms = val.get("ts_ms")
    op = val.get("op")
    return lsn, ts_ms, op

def stream_jsonl(path: str):
    with open(path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            yield json.loads(line)

def to_event(obj: dict) -> Event:
    if obj.get("value") is None:
        pk = _extract_pk(obj)
        return Event(pk=pk, lsn=None, op="t", ts_ms=None, raw=obj)
    lsn, ts_ms, op = _extract_meta(obj)
    pk = _extract_pk(obj)
    return Event(pk=pk, lsn=lsn, op=op, ts_ms=ts_ms, raw=obj)

def assert_monotonic_lsn(events: list[Event]) -> int:
    violations = 0
    last_lsn = -1
    for ev in events:
        if ev.op == "t":
            continue
        if ev.lsn is None:
            violations += 1
            continue
        if ev.lsn < last_lsn:
            violations += 1
        last_lsn = max(last_lsn, ev.lsn if ev.lsn is not None else last_lsn)
    return violations

def assert_tombstone_rules(events: list[Event]) -> int:
    if not events:
        return 0
    has_delete = any(e.op == "d" for e in events)
    last_non_t_index = max((i for i, e in enumerate(events) if e.op != "t"), default=-1)
    tombstone_indices = [i for i, e in enumerate(events) if e.op == "t"]

    if not tombstone_indices:
        return 1 if has_delete else 0

    if tombstone_indices and tombstone_indices[-1] != len(events) - 1:
        return 1

    if has_delete and last_non_t_index >= 0 and events[last_non_t_index].op != "d":
        return 1

    return 0

def scan(window_file: str):
    groups: dict[tuple, list[Event]] = defaultdict(list)
    total = 0
    noop = 0
    for rec in stream_jsonl(window_file):
        ev = to_event(rec)
        groups[ev.pk].append(ev)
        total += 1
        if ev.op in ("r", "t") or (ev.op is None and rec.get("value") is None):
            noop += 1

    window_drift_count = 0
    tombstone_violation_count = 0
    for pk, evs in groups.items():
        window_drift_count += assert_monotonic_lsn(evs)
        tombstone_violation_count += assert_tombstone_rules(evs)

    noop_rate = (noop / total) if total else 1.0

    print(json.dumps({
        "pk_count": len(groups),
        "event_count": total,
        "window_drift_count": window_drift_count,
        "tombstone_violation_count": tombstone_violation_count,
        "noop_rate": round(noop_rate, 6),
    }, sort_keys=True))

    if window_drift_count > 0 or tombstone_violation_count > 0 or noop_rate < 0.999:
        sys.exit(1)

def main(argv):
    if len(argv) < 2:
        print("usage: lsn_scanner.py <path/to/debezium_sample.jsonl>", file=sys.stderr)
        sys.exit(2)
    scan(argv[1])

if __name__ == "__main__":
    main(sys.argv)
