# Brand Story Quickstart

## Enabling Features
Set `BRAND_STORY_ENABLED=true` in your environment.

## Generating a Plan
```python
from summit.brand_story import plan_series, BrandStoryInput
input_data = BrandStoryInput(...)
plan = plan_series(input_data)
```
