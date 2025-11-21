#!/usr/bin/env python3
"""Analyze behavioral telemetry sessions to extract UX and threat insights."""
from __future__ import annotations

import json
from collections import Counter, defaultdict
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from statistics import fmean, median
from typing import Iterable, List

DATA_PATH = Path(__file__).with_name("events.json")
OUTPUT_PATH = Path(__file__).with_name("insights.md")


@dataclass
class Session:
    session_id: str
    user_id: str
    role: str
    device: str
    region: str
    time_in_view_sec: float
    clicks: int
    edit_rate: float
    hover_time_sec: float
    scroll_depth_pct: float
    latency_ms_avg: float
    feature_usage: List[str]
    security_flags: List[str]
    timestamp: datetime

    @property
    def minutes_in_view(self) -> float:
        return self.time_in_view_sec / 60 if self.time_in_view_sec else 0.0

    @property
    def click_rate_per_min(self) -> float:
        minutes = self.minutes_in_view
        return self.clicks / minutes if minutes else 0.0

    @property
    def focus_ratio(self) -> float:
        return self.hover_time_sec / self.time_in_view_sec if self.time_in_view_sec else 0.0

    @property
    def interaction_intensity(self) -> float:
        # Blend click velocity and edit rate to highlight investigative depth
        return 0.65 * self.click_rate_per_min + 0.35 * (self.edit_rate * 10)


def load_sessions() -> List[Session]:
    raw = json.loads(DATA_PATH.read_text())
    sessions: List[Session] = []
    for row in raw:
        sessions.append(
            Session(
                session_id=row["session_id"],
                user_id=row["user_id"],
                role=row["role"],
                device=row["device"],
                region=row["region"],
                time_in_view_sec=float(row["time_in_view_sec"]),
                clicks=int(row["clicks"]),
                edit_rate=float(row["edit_rate"]),
                hover_time_sec=float(row["hover_time_sec"]),
                scroll_depth_pct=float(row["scroll_depth_pct"]),
                latency_ms_avg=float(row["latency_ms_avg"]),
                feature_usage=list(row.get("feature_usage", [])),
                security_flags=list(row.get("security_flags", [])),
                timestamp=datetime.fromisoformat(row["timestamp"].replace("Z", "+00:00")),
            )
        )
    return sessions


def summarize_numeric(values: Iterable[float]) -> dict[str, float]:
    values = list(values)
    if not values:
        return {"avg": 0.0, "p50": 0.0, "p90": 0.0}
    sorted_vals = sorted(values)
    p90_index = max(0, int(len(sorted_vals) * 0.9) - 1)
    return {
        "avg": round(fmean(sorted_vals), 2),
        "p50": round(median(sorted_vals), 2),
        "p90": round(sorted_vals[p90_index], 2),
    }


def build_markdown(sessions: List[Session]) -> str:
    total_sessions = len(sessions)
    unique_users = {s.user_id for s in sessions}
    # Investigative depth threshold calibrated to highlight the most engaged humans
    high_intensity = [s for s in sessions if s.interaction_intensity >= 25]
    scanning_sessions = [s for s in sessions if s.click_rate_per_min < 5 and s.time_in_view_sec >= 480]

    device_stats = {}
    for device, group in group_by(sessions, key=lambda s: s.device).items():
        device_stats[device] = {
            "latency": summarize_numeric(s.latency_ms_avg for s in group),
            "click_rate": summarize_numeric(s.click_rate_per_min for s in group),
            "scroll_depth": summarize_numeric(s.scroll_depth_pct for s in group),
        }

    role_focus = {}
    for role, group in group_by(sessions, key=lambda s: s.role).items():
        role_focus[role] = {
            "avg_focus": round(fmean(s.focus_ratio for s in group), 2),
            "avg_intensity": round(fmean(s.interaction_intensity for s in group), 2),
        }

    hourly_distribution = Counter(s.timestamp.hour for s in sessions)
    top_hours = sorted(hourly_distribution.items(), key=lambda kv: kv[1], reverse=True)[:5]

    feature_counter = Counter()
    for s in sessions:
        feature_counter.update(s.feature_usage)

    latency_hotspots = []
    for (region, device), group in group_by(
        sessions, key=lambda s: (s.region, s.device)
    ).items():
        stats = summarize_numeric(s.latency_ms_avg for s in group)
        latency_hotspots.append(((region, device), stats))
    latency_hotspots.sort(key=lambda item: item[1]["avg"], reverse=True)

    suspicious_sessions = [
        s
        for s in sessions
        if s.security_flags
        or s.click_rate_per_min >= 35
        or (s.edit_rate >= 6 and s.focus_ratio < 0.1)
    ]

    automation_like = [
        s
        for s in sessions
        if s.click_rate_per_min >= 35 and s.focus_ratio <= 0.1 and s.edit_rate >= 6
    ]

    low_latency_power_users = [
        s for s in high_intensity if s.latency_ms_avg <= 190
    ]

    markdown = [
        "# Behavioral Telemetry Insights",
        "",
        "## Overview",
        f"* **Sessions analyzed:** {total_sessions}",
        f"* **Unique users:** {len(unique_users)}",
        f"* **High-intensity investigative sessions:** {len(high_intensity)}",
        f"* **Long-form scanning sessions:** {len(scanning_sessions)}",
        "",
        "## Adaptive UX Opportunities",
        "",
        "### Device performance spread",
        "| Device | Avg latency (ms) | P50 latency | P90 latency | Avg clicks/min | P50 clicks/min | P90 clicks/min | Avg scroll % |",
        "| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |",
    ]
    for device, stats in device_stats.items():
        row = "| {device} | {latency[avg]} | {latency[p50]} | {latency[p90]} | {click_rate[avg]} | {click_rate[p50]} | {click_rate[p90]} | {scroll_depth[avg]} |".format(
            device=device,
            latency=stats["latency"],
            click_rate=stats["click_rate"],
            scroll_depth=stats["scroll_depth"],
        )
        markdown.append(row)

    markdown.extend(
        [
            "",
            "### Role focus and intensity",
            "| Role | Avg focus ratio | Avg interaction intensity |",
            "| --- | ---: | ---: |",
        ]
    )
    for role, stats in role_focus.items():
        markdown.append(
            f"| {role} | {stats['avg_focus']:.2f} | {stats['avg_intensity']:.2f} |"
        )

    markdown.extend(
        [
            "",
            "### Peak engagement windows",
            "| Hour (UTC) | Session count |",
            "| ---: | ---: |",
        ]
    )
    for hour, count in top_hours:
        markdown.append(f"| {hour:02d}:00 | {count} |")

    markdown.extend(
        [
            "",
            "### Feature touch points",
            "| Feature | Usage count |",
            "| --- | ---: |",
        ]
    )
    for feature, count in feature_counter.most_common():
        markdown.append(f"| {feature} | {count} |")

    markdown.extend(
        [
            "",
            "### Latency hotspots by region and device",
            "| Region | Device | Avg latency (ms) | P90 latency (ms) |",
            "| --- | --- | ---: | ---: |",
        ]
    )
    for (region, device), stats in latency_hotspots:
        markdown.append(
            f"| {region} | {device} | {stats['avg']} | {stats['p90']} |"
        )

    markdown.extend(
        [
            "",
            "## Threat Detection Signals",
            "",
            f"* **Sessions with security flags or automation signatures:** {len(suspicious_sessions)}",
            f"* **Automation-like velocity clusters:** {len(automation_like)}",
            f"* **Power users on low latency paths (optimize for them):** {len(low_latency_power_users)}",
            "",
            "### Suspicious sessions",
            "| Session | User | Clicks/min | Edit rate | Focus ratio | Latency (ms) | Flags |",
            "| --- | --- | ---: | ---: | ---: | ---: | --- |",
        ]
    )
    for s in suspicious_sessions:
        markdown.append(
            "| {session} | {user} | {clicks:.1f} | {edit:.1f} | {focus:.2f} | {latency:.0f} | {flags} |".format(
                session=s.session_id,
                user=s.user_id,
                clicks=s.click_rate_per_min,
                edit=s.edit_rate,
                focus=s.focus_ratio,
                latency=s.latency_ms_avg,
                flags=", ".join(s.security_flags) or "-",
            )
        )

    markdown.extend(
        [
            "",
            "### Long-form scanning cohorts",
            "| Session | User | Minutes in view | Clicks/min | Scroll depth % |",
            "| --- | --- | ---: | ---: | ---: |",
        ]
    )
    for s in scanning_sessions:
        markdown.append(
            f"| {s.session_id} | {s.user_id} | {s.minutes_in_view:.1f} | {s.click_rate_per_min:.1f} | {s.scroll_depth_pct:.1f} |"
        )

    markdown.extend(
        [
            "",
            "### High-intensity investigative sessions",
            "| Session | User | Clicks/min | Edit rate | Interaction intensity | Latency (ms) |",
            "| --- | --- | ---: | ---: | ---: | ---: |",
        ]
    )
    for s in high_intensity:
        markdown.append(
            f"| {s.session_id} | {s.user_id} | {s.click_rate_per_min:.1f} | {s.edit_rate:.1f} | {s.interaction_intensity:.1f} | {s.latency_ms_avg:.0f} |"
        )

    markdown.append("")
    return "\n".join(markdown)


def group_by(items: Iterable[Session], key):
    groups: defaultdict = defaultdict(list)
    for item in items:
        groups[key(item)].append(item)
    return groups


def main() -> None:
    sessions = load_sessions()
    markdown = build_markdown(sessions)
    OUTPUT_PATH.write_text(markdown)
    print(f"Wrote insights to {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
