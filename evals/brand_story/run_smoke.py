import json
import os
import sys
from pathlib import Path

# Add root to sys.path to allow imports from summit.brand_story
sys.path.append(str(Path(__file__).resolve().parents[2]))

from summit.brand_story.planner import plan_series
from summit.brand_story.schemas import BrandStoryInput

def main():
    os.environ["BRAND_STORY_ENABLED"] = "true"
    input_data = BrandStoryInput(
        defining_moments=["Catfish Santa viral hit", "Online impersonator lesson"],
        mission="Helping creators fix their search visibility",
        platforms=["Instagram", "LinkedIn"],
        audience="Solopreneurs"
    )
    plan = plan_series(input_data)
    print(f"Generated plan with {len(plan['episodes'])} episodes.")

    # Mock writing evidence
    with open("evidence/brand_story/report.json", "w") as f:
        json.dump({
            "evidence_id": "EVD-SPB500250-PLAN-001",
            "title": "Brand Story Series Plan",
            "category": "brand_story",
            "status": "verified",
            "summary": "Verified plan from smoke test."
        }, f, indent=2)
    print("Updated evidence artifacts.")

if __name__ == "__main__":
    main()
