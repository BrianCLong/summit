#!/usr/bin/env python3
import argparse
import json
import os
import time
import urllib.parse
import urllib.request


def parse_duration(duration: str) -> int:
    units = {"s": 1, "m": 60, "h": 3600}
    if not duration:
        raise ValueError("duration is required")
    unit = duration[-1]
    if unit not in units:
        raise ValueError(f"unsupported duration unit: {unit}")
    try:
        value = float(duration[:-1])
    except ValueError as exc:
        raise ValueError(f"invalid duration value: {duration}") from exc
    return int(value * units[unit])


def fetch_range(base_url: str, query: str, window: str, step: str) -> float:
    end = int(time.time())
    start = end - parse_duration(window)
    step_seconds = parse_duration(step)
    params = {
        "query": query,
        "start": start,
        "end": end,
        "step": step_seconds,
    }
    encoded = urllib.parse.urlencode(params)
    url = f"{base_url}/api/v1/query_range?{encoded}"

    request = urllib.request.Request(url)
    token = os.environ.get("PROMETHEUS_BEARER_TOKEN")
    if token:
        request.add_header("Authorization", f"Bearer {token}")

    with urllib.request.urlopen(request) as response:
        payload = json.loads(response.read().decode())

    if payload.get("status") != "success":
        raise RuntimeError(f"Prometheus returned non-success status: {payload}")

    results = payload.get("data", {}).get("result", [])
    series = []
    for item in results:
        for _, value in item.get("values", []):
            try:
                series.append(float(value))
            except ValueError:
                continue

    if not series:
        raise RuntimeError("No datapoints returned for query")

    return max(series)


def main() -> None:
    parser = argparse.ArgumentParser(description="Prometheus query helper")
    parser.add_argument("query", help="PromQL query to run")
    parser.add_argument("--base-url", required=True, help="Prometheus base URL")
    parser.add_argument("--window", default="10m", help="Lookback window (default: 10m)")
    parser.add_argument("--step", default="30s", help="Query resolution step (default: 30s)")
    args = parser.parse_args()

    value = fetch_range(args.base_url.rstrip("/"), args.query, args.window, args.step)
    print(json.dumps({"value": value}, indent=2))


if __name__ == "__main__":
    main()
