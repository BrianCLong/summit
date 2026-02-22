import json
from pathlib import Path

import tools.session_sweeper as sweeper


def write_sessions(tmp_path: Path, payload):
    path = tmp_path / "sessions.json"
    path.write_text(json.dumps(payload), encoding="utf-8")
    return path


def test_build_plan_prioritizes_pr_ready_and_detects_cold_categories(tmp_path):
    data = [
        {
            "name": "timeline-ui",
            "status": "pr-ready",
            "category": "UX",
            "remaining_steps": 1,
        },
        {
            "name": "sec-hardening",
            "status": "needs-more-work",
            "category": "Security",
            "remaining_steps": 2,
        },
    ]
    path = write_sessions(tmp_path, data)
    sessions = sweeper.load_sessions(path)

    plan = sweeper.build_plan(sessions, capacity=2, reserve_slot=1)

    # Capacity 2 with 1 reserved slot forces freeing one session
    assert plan.free_slots_needed == 1
    # PR-ready should be first recommendation
    assert plan.to_close_first[0].name == "timeline-ui"
    # Detect missing categories for backfill
    assert "Data Integrity" in plan.cold_categories
    assert "Golden Path" in plan.cold_categories


def test_format_plan_includes_reasons(tmp_path):
    data = [
        {
            "name": "blocked-ci",
            "status": "blocked",
            "category": "CI Stability",
            "remaining_steps": 2,
            "blocked": True,
            "blocker": "waiting for infra fix",
        },
        {
            "name": "pr-open",
            "status": "pr-created",
            "category": "Security",
            "remaining_steps": 1,
        },
    ]
    path = write_sessions(tmp_path, data)
    sessions = sweeper.load_sessions(path)

    plan = sweeper.build_plan(sessions, capacity=3, reserve_slot=1)
    text = sweeper.format_plan(plan)

    assert "blocked-ci [CI Stability]" in text
    assert "blocked (waiting for infra fix)" in text.lower()
    assert "pr-open [Security]" in text
    assert "Backfill queue" in text
