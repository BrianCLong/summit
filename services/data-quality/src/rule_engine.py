from __future__ import annotations

import re

from models import EvaluationRequest, Finding


def evaluate(request: EvaluationRequest) -> list[Finding]:
    findings: list[Finding] = []
    payload = request.payload
    for rule in request.rules:
        field_value = payload.get(rule.field)
        if rule.type == "required":
            if field_value is None:
                findings.append(
                    Finding(rule_id=rule.id, field=rule.field, message="field is required")
                )
        elif rule.type == "regex":
            pattern = rule.params.get("pattern", "")
            if field_value is None or not re.match(pattern, str(field_value)):
                findings.append(
                    Finding(rule_id=rule.id, field=rule.field, message="regex mismatch")
                )
        elif rule.type == "range":
            min_v = rule.params.get("min")
            max_v = rule.params.get("max")
            if field_value is None or not (min_v <= field_value <= max_v):
                findings.append(Finding(rule_id=rule.id, field=rule.field, message="out of range"))
        elif rule.type == "ref":
            allowed = set(rule.params.get("allowed", []))
            if field_value not in allowed:
                findings.append(
                    Finding(rule_id=rule.id, field=rule.field, message="reference check failed")
                )
    return findings
