"""Indicator normalization utilities."""

from __future__ import annotations

import ipaddress


def _split_labels(value: str | None) -> list[str]:
    if not value:
        return []
    return [v.strip() for v in value.split("|") if v.strip()]


def normalize_indicator(row: dict[str, object]) -> dict[str, object]:
    ind_type = str(row.get("type", "")).upper()
    value = str(row.get("value", ""))
    if ind_type == "DOMAIN":
        value = value.lower()
    elif ind_type == "IP":
        value = str(ipaddress.ip_address(value))
    labels = row.get("labels")
    if isinstance(labels, str):
        labels = _split_labels(labels)
    return {
        "type": ind_type,
        "value": value,
        "labels": labels or [],
        "tlp": row.get("tlp", "TLP:CLEAR"),
        "confidence": int(row.get("confidence", 0)),
    }


def dedupe_indicators(indicators: list[dict[str, object]]) -> list[dict[str, object]]:
    """Merge indicators with the same (type, value) keeping highest confidence."""
    best: dict[tuple, dict[str, object]] = {}
    for ind in indicators:
        key = (ind["type"], ind["value"])
        if key not in best or ind["confidence"] > best[key]["confidence"]:
            best[key] = ind
    return list(best.values())
