# Brand Story Quickstart

How to use the Summit Brand Story module.

## 1. Supply Input

Provide defining moments, your mission, and audience archetype.

## 2. Generate Plan

```python
from summit.brand_story.planner import plan_series
from summit.brand_story.schemas import BrandStoryInput

input_data = BrandStoryInput(
    defining_moments=["Starting my first company", "Facing a major setback"],
    mission="Empowering solo entrepreneurs",
    audience_archetype="Aspiring founders",
    goal="Build authority"
)

plan = plan_series(input_data)
```

## 3. Verify Evidence

Run the validation tool:
`python3 tools/evidence_validate.py`
