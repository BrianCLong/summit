# Brand Story Quickstart

## Setup
Enable the feature:
\`export BRAND_STORY_ENABLED=true\`

## Usage
\`\`\`python
from summit.brand_story import plan_series, BrandStoryInput

input_data = BrandStoryInput(
    platform="LinkedIn",
    audience_archetype="Developers",
    goal="Hiring",
    defining_moments=["Moment 1", "Moment 2"],
    mission="Build great teams"
)

plan = plan_series(input_data)
print(plan)
\`\`\`

## Evidence
Run \`python3 evals/brand_story/run_smoke.py\` to generate evidence artifacts.
Check \`evidence/brand_story/\` for results.
