"""Simple correlation engine."""

from __future__ import annotations


def correlate(indicators: list[dict[str, object]], logs: list[dict[str, str]]):
    """Return sightings where DNS query matches a domain indicator."""
    index = {(i["type"], i["value"]): i for i in indicators}
    sightings: list[dict[str, object]] = []
    for log in logs:
        key = ("DOMAIN", log.get("query", ""))
        ind = index.get(key)
        if ind:
            sightings.append({"indicator": ind, "log": log})
    return sightings
