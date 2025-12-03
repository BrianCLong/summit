"""
Session Sweeper: prioritize Jules-style sessions for closure/backfill.

This utility reads a JSON file describing active sessions and prints a
prioritized action plan to free capacity, close PR-ready work, and
backfill cold categories.

Example input structure:
[
  {
    "name": "timeline-ui",
    "status": "pr-ready",
    "category": "UX",
    "remaining_steps": 1,
    "blocked": false
  },
  {
    "name": "ci-hardening",
    "status": "needs-more-work",
    "category": "CI Stability",
    "remaining_steps": 3,
    "blocked": true,
    "blocker": "waiting for infra fix"
  }
]

Statuses supported: pr-ready, pr-created, needs-more-work, blocked.
"""
from __future__ import annotations

import argparse
import json
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable, List, Optional

PRIORITY_CATEGORIES = [
    "Security",
    "Data Integrity",
    "Golden Path",
    "CI Stability",
    "Graph",
    "Infrastructure",
    "UX",
    "Analytics",
]


@dataclass
class Session:
    name: str
    status: str
    category: str
    remaining_steps: int = 1
    blocked: bool = False
    blocker: Optional[str] = None

    @classmethod
    def from_dict(cls, payload: dict) -> "Session":
        return cls(
            name=str(payload.get("name", "unknown")),
            status=str(payload.get("status", "needs-more-work")).lower(),
            category=str(payload.get("category", "Uncategorized")),
            remaining_steps=int(payload.get("remaining_steps", 1)),
            blocked=bool(payload.get("blocked", False)),
            blocker=payload.get("blocker"),
        )

    def is_pr_ready(self) -> bool:
        return self.status in {"pr-ready", "pr created", "pr-created"}

    def is_pr_open(self) -> bool:
        return self.status in {"pr-created", "pr created"}


@dataclass
class Plan:
    free_slots_needed: int
    to_close_first: List[Session]
    cold_categories: List[str]
    summary: str


def load_sessions(source: Path) -> List[Session]:
    with source.open("r", encoding="utf-8") as handle:
        data = json.load(handle)
    if not isinstance(data, list):
        raise ValueError("Input JSON must be a list of session objects")
    return [Session.from_dict(item) for item in data]


def _recommend_closures(sessions: Iterable[Session]) -> List[Session]:
    # Order: PR-ready, PR already open, blocked, needs-work; within each, fewer remaining steps first.
    def sort_key(session: Session):
        status_order = {
            "pr-ready": 0,
            "pr created": 0,
            "pr-created": 0,
            "blocked": 2,
            "needs-more-work": 3,
        }
        return (
            status_order.get(session.status, 4),
            session.remaining_steps,
            session.name,
        )

    return sorted(sessions, key=sort_key)


def _detect_cold_categories(sessions: Iterable[Session]) -> List[str]:
    observed = {s.category for s in sessions}
    return [cat for cat in PRIORITY_CATEGORIES if cat not in observed]


def build_plan(sessions: List[Session], capacity: int, reserve_slot: int) -> Plan:
    free_slots_needed = max(0, len(sessions) - (capacity - reserve_slot))
    suggestion_count = free_slots_needed or min(2, len(sessions)) or 1
    to_close_first = _recommend_closures(sessions)[:suggestion_count]
    cold_categories = _detect_cold_categories(sessions)

    summary_lines = [
        f"Sessions observed: {len(sessions)} / capacity {capacity} (reserve {reserve_slot})",
        f"Free slots needed: {free_slots_needed}",
    ]
    if to_close_first:
        summary_lines.append(
            "Close/ship in this order: "
            + ", ".join(f"{s.name} ({s.status})" for s in to_close_first)
        )
    if cold_categories:
        summary_lines.append(
            "Backfill cold categories: " + ", ".join(cold_categories)
        )
    return Plan(free_slots_needed, to_close_first, cold_categories, "\n".join(summary_lines))


def format_plan(plan: Plan) -> str:
    lines = ["=== SESSION PLAN ===", plan.summary, ""]
    if plan.free_slots_needed > 0:
        lines.append(
            f"Action: free at least {plan.free_slots_needed} slot(s) by closing PR-ready work."
        )
    lines.append("Recommended closures:")
    for session in plan.to_close_first:
        reason = "PR-ready" if session.is_pr_ready() else "Quick win"
        if session.blocked:
            reason = f"Blocked ({session.blocker or 'unspecified'})"
        lines.append(
            f"- {session.name} [{session.category}] — {reason}; remaining steps: {session.remaining_steps}"
        )
    if plan.cold_categories:
        lines.append("Backfill queue:")
        for category in plan.cold_categories:
            lines.append(f"- Add prompt for {category}")
    return "\n".join(lines)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Prioritize session closures and backfill prompts.")
    parser.add_argument("input", type=Path, help="Path to JSON file describing sessions")
    parser.add_argument("--capacity", type=int, default=15, help="Maximum concurrent sessions")
    parser.add_argument(
        "--reserve-slot",
        type=int,
        default=1,
        help="Number of slots to keep free for urgent prompts",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    sessions = load_sessions(args.input)
    plan = build_plan(sessions, args.capacity, args.reserve_slot)
    print(format_plan(plan))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
