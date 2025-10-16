#!/usr/bin/env python3
"""Enrich events with candidate numbers-station metadata."""
from __future__ import annotations

import argparse
import json
from collections.abc import Iterable
from datetime import datetime, timedelta
from pathlib import Path

if __package__ in (None, ""):
    import sys

    sys.path.append(str(Path(__file__).resolve().parents[1] / "detector"))
    import utils  # type: ignore
else:  # pragma: no branch
    from detector import utils


def load_source(cache_dir: Path, name: str) -> list[dict]:
    path = cache_dir / f"{name}.json"
    if not path.exists():
        print(f"[enrich] cache file missing: {path}")
        return []
    with path.open("r", encoding="utf-8") as handle:
        data = json.load(handle)
    if not isinstance(data, list):
        print(f"[enrich] unexpected format in {path}")
        return []
    return data


def parse_time(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def matches(event: dict, record: dict, tolerance_khz: float, window_min: int) -> bool:
    freq_hint = event.get("freq_khz_hint")
    if freq_hint is None:
        return False
    if abs(freq_hint - float(record.get("freq_khz", 0.0))) > tolerance_khz:
        return False
    event_time = parse_time(event["utc"])
    start = parse_time(record["start_utc"]) if "start_utc" in record else event_time
    end = parse_time(record.get("end_utc", record.get("start_utc", event["utc"])))
    window = timedelta(minutes=window_min)
    return start - window <= event_time <= end + window


def enrich(
    events: Iterable[dict], catalog: list[dict], tolerance_khz: float, window_min: int
) -> list[dict]:
    enriched = []
    for event in events:
        candidate: dict | None = None
        for record in catalog:
            if matches(event, record, tolerance_khz, window_min):
                candidate = record
                break
        if candidate:
            event = dict(event)
            event["candidate_station"] = candidate.get("label")
            event["source_hint"] = candidate.get("source")
        enriched.append(event)
    return enriched


def main() -> None:
    parser = argparse.ArgumentParser(description="Enrich HF events with schedule metadata")
    parser.add_argument("--config", required=True, type=Path)
    args = parser.parse_args()

    cfg = utils.load_config(args.config)
    enrich_cfg = cfg.get("enrichment", {})
    if not enrich_cfg.get("enabled", False):
        print("enrichment disabled in config")
        return

    cache_dir = Path(enrich_cfg.get("cache_dir", "./cache"))
    cache_dir.mkdir(parents=True, exist_ok=True)

    catalog: list[dict] = []
    for source in enrich_cfg.get("sources", []):
        catalog.extend(load_source(cache_dir, source))

    events_path = Path(cfg["paths"]["events"])
    if not events_path.exists():
        print("events file not found")
        return

    with events_path.open("r", encoding="utf-8") as handle:
        events = [json.loads(line) for line in handle if line.strip()]

    enriched_events = enrich(
        events,
        catalog,
        enrich_cfg.get("freq_tolerance_khz", 3),
        enrich_cfg.get("time_window_min", 30),
    )

    out_path = events_path.parent / "enriched.jsonl"
    with out_path.open("w", encoding="utf-8") as handle:
        for event in enriched_events:
            handle.write(json.dumps(event) + "\n")
    print(f"wrote {len(enriched_events)} enriched events to {out_path}")


if __name__ == "__main__":
    main()
