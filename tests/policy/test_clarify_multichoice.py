import pytest
from summit.policy.clarify import ClarifyStep

def test_prompt_structure():
    step = ClarifyStep("Which path?", ["A", "B"])
    prompt = step.prompt()
    assert prompt["message"] == "Which path?"
    assert prompt["choices"] == ["A", "B"]

def test_select_valid():
    step = ClarifyStep("Which path?", ["A", "B"])
    choice = step.select("A")
    assert choice == "A"
    assert step.selected_choice == "A"

def test_select_invalid():
    step = ClarifyStep("Which path?", ["A", "B"])
    with pytest.raises(ValueError):
        step.select("C")
