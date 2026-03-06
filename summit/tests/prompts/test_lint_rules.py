import pytest
from summit.prompts.lint import lint_prompt

def test_lint_pass():
    prompt = {
        "output_format": "text",
        "budgets": {"max_examples": 5},
        "components": {"examples": [], "task_description": "Do this"}
    }
    errors = lint_prompt(prompt)
    assert not errors

def test_lint_missing_output():
    prompt = {
        "budgets": {"max_examples": 5},
        "components": {"examples": [], "task_description": "Do this"}
    }
    errors = lint_prompt(prompt)
    assert any("OUTPUT-FORMAT" in e for e in errors)

def test_lint_max_examples_exceeded():
    prompt = {
        "output_format": "text",
        "budgets": {"max_examples": 1},
        "components": {
            "examples": [{"input": "a", "output": "b"}, {"input": "c", "output": "d"}],
            "task_description": "Do this"
        }
    }
    errors = lint_prompt(prompt)
    assert any("MAX-EXAMPLES" in e for e in errors)

def test_lint_vagueness():
    prompt = {
        "output_format": "text",
        "budgets": {"max_examples": 5},
        "components": {"examples": [], "task_description": "Write something about X"}
    }
    errors = lint_prompt(prompt)
    assert any("VAGUENESS" in e for e in errors)
