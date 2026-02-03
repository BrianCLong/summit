import pytest
from summit.brand_story.planner import plan_series
from summit.brand_story.schemas import BrandStoryInput
from summit.brand_story.flags import enabled

def test_planner_disabled(monkeypatch):
    monkeypatch.setenv("BRAND_STORY_ENABLED", "false")
    input_data = BrandStoryInput(defining_moments=["A"], mission="M", platforms=["P"], audience="A")
    result = plan_series(input_data)
    assert result["enabled"] is False

def test_planner_enabled(monkeypatch):
    monkeypatch.setenv("BRAND_STORY_ENABLED", "true")
    input_data = BrandStoryInput(defining_moments=["A"], mission="M", platforms=["P"], audience="A")
    result = plan_series(input_data)
    assert result["enabled"] is True
    assert len(result["episodes"]) == 5
