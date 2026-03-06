import pytest
from pathlib import Path
from summit.prompts.validate import validate_prompt_artifact
from summit.prompts.load import load_prompt_artifact

EXAMPLES_DIR = Path("prompts/examples")

def test_bytebytego_zero_shot_valid():
    path = EXAMPLES_DIR / "bytebytego_zero_shot.prompt.yaml"
    data = load_prompt_artifact(path)
    errors = validate_prompt_artifact(data)
    assert not errors, f"Validation errors: {errors}"

def test_bytebytego_few_shot_valid():
    path = EXAMPLES_DIR / "bytebytego_few_shot.prompt.yaml"
    data = load_prompt_artifact(path)
    errors = validate_prompt_artifact(data)
    assert not errors, f"Validation errors: {errors}"

def test_invalid_prompt_missing_id():
    data = {
        "components": {"task_description": "foo", "concrete_task": "bar"},
        "techniques": {}
    }
    errors = validate_prompt_artifact(data)
    assert any("id" in e for e in errors)

def test_invalid_prompt_bad_id_format():
    data = {
        "id": "bad-id",
        "components": {"task_description": "foo", "concrete_task": "bar"},
        "techniques": {}
    }
    errors = validate_prompt_artifact(data)
    assert any("id" in e for e in errors)
