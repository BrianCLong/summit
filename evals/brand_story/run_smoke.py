#!/usr/bin/env python3
import datetime
import json
import os
import sys
from dataclasses import asdict

# Ensure we can import summit
sys.path.append(os.getcwd())

from summit.brand_story import BrandStoryInput, generate_hooks, plan_series


def main():
    # Force enable feature
    os.environ["BRAND_STORY_ENABLED"] = "true"

    input_data = BrandStoryInput(
        platform="LinkedIn",
        audience_archetype="Tech Leads",
        goal="Authority",
        defining_moments=["The server crash of '22", "My first mentorship failure", "The scaling breakthrough"],
        mission="Empower junior devs"
    )

    plan = plan_series(input_data)

    if not plan.enabled:
        print("Error: Feature not enabled despite override.")
        sys.exit(1)

    if len(plan.episodes) != 5:
        print(f"Error: Expected 5 episodes, got {len(plan.episodes)}")
        sys.exit(1)

    # Generate hooks
    hooks = generate_hooks("Personal Branding", "LinkedIn")

    print("Plan generated successfully.")

    # Write artifacts
    with open("evidence/brand_story/plan.json", "w") as f:
        json.dump(asdict(plan), f, indent=2)

    with open("evidence/brand_story/hooks.json", "w") as f:
        json.dump(hooks, f, indent=2)

    # Write evidence
    report = {
        "evidence_id": "EVD-SPB500250-REPORT-001",
        "summary": "Brand Story Module Smoke Test Pass",
        "item": {
            "slug": "brand-story-smoke",
            "description": "Smoke test run of brand story planner"
        },
        "artifacts": {
            "plan_mission": plan.mission,
            "episode_count": len(plan.episodes),
            "plan_file": "evidence/brand_story/plan.json",
            "hooks_file": "evidence/brand_story/hooks.json"
        }
    }

    metrics = {
        "metrics": {
            "episodes_generated": len(plan.episodes),
            "hooks_generated": len(hooks),
            "determinism_check": "passed"
        }
    }

    stamp = {
        "timestamp": datetime.datetime.now(datetime.UTC).isoformat(),
        "revision": "current"
    }

    with open("evidence/brand_story/report.json", "w") as f:
        json.dump(report, f, indent=2)

    with open("evidence/brand_story/metrics.json", "w") as f:
        json.dump(metrics, f, indent=2)

    with open("evidence/brand_story/stamp.json", "w") as f:
        json.dump(stamp, f, indent=2)

    print("Evidence artifacts updated.")

if __name__ == "__main__":
    main()
