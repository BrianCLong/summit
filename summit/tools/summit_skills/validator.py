from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import yaml
from jsonschema import Draft202012Validator

SCHEMA_PATH = Path("summit/skillpacks/_schema/skillpack.schema.json")

@dataclass(frozen=True)
class ValidationIssue:
  path: str
  message: str

@dataclass(frozen=True)
class ValidationResult:
  ok: bool
  issues: list[ValidationIssue]

def _load_schema() -> dict[str, Any]:
  return json.loads(SCHEMA_PATH.read_text(encoding="utf-8"))

def validate_skillpack(skillpack_yaml: Path) -> ValidationResult:
  data = yaml.safe_load(skillpack_yaml.read_text(encoding="utf-8"))
  schema = _load_schema()
  v = Draft202012Validator(schema)
  issues: list[ValidationIssue] = []
  for err in sorted(v.iter_errors(data), key=str):
    issues.append(ValidationIssue(path="/".join([str(p) for p in err.absolute_path]), message=err.message))
  return ValidationResult(ok=(len(issues) == 0), issues=issues)
