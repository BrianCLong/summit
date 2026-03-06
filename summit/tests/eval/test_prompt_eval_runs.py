import pytest
from summit.eval.prompt_eval.runner import run_eval

def test_run_eval_success():
    prompt = {
        "user_template": "Classify: {{text}}",
        "output_format": "one-word"
    }
    fixtures = [
        {"input": "This is good", "expected": "Positive"},
        {"input": "This is bad", "expected": "Negative"}
    ]

    # MockLLM in runner returns "Positive" for "good" and "Negative" for "bad"
    result = run_eval(prompt, fixtures)

    assert result["score"] == 1.0
    assert result["outputs"] == ["Positive", "Negative"]

def test_run_eval_fail_format():
    prompt = {
        "user_template": "Just repeat: {{text}}",
        "output_format": "one-word"
    }
    fixtures = [
        {"input": "This is a long sentence"}
    ]

    # MockLLM returns "Unknown" for inputs without keywords
    result = run_eval(prompt, fixtures)

    # "Unknown" is one word, so it complies with format "one-word"
    assert result["score"] == 1.0
    assert result["outputs"] == ["Unknown"]
