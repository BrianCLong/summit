from datetime import timedelta
from typing import Any

from .models import BytecodeInstruction


class EnforcementEngine:
    def __init__(self, bytecode: list[BytecodeInstruction]):
        self.bytecode = bytecode
        self._context: dict[str, Any] = {}

    def evaluate(self, context: dict[str, Any]) -> tuple[str, dict[str, Any]]:
        reasons: list[dict[str, Any]] = []
        idx = 0

        while idx < len(self.bytecode):
            instr = self.bytecode[idx]

            if instr.op == "REQUIRE_LICENSE":
                if context.get("license") != instr.args[0]:
                    return "deny", self._reason("license-mismatch", reasons, instr)
                reasons.append(self._clause("license", instr.args[0]))
                idx += 1
                continue

            if instr.op == "REQUIRE_BASIS":
                if context.get("legal_basis") != instr.args[0]:
                    return "deny", self._reason("legal-basis-mismatch", reasons, instr)
                reasons.append(self._clause("legal_basis", instr.args[0]))
                idx += 1
                continue

            if instr.op == "ALLOW_PURPOSES":
                if context.get("purpose") not in instr.args[0]:
                    return "deny", self._reason("purpose-not-allowed", reasons, instr)
                reasons.append(self._clause("purpose", instr.args[0]))
                idx += 1
                continue

            if instr.op == "MAX_RETENTION":
                if not self._retention_allows(context.get("retention"), instr.args[0]):
                    return "deny", self._reason("retention-exceeded", reasons, instr)
                reasons.append(self._clause("retention", instr.args[0]))
                idx += 1
                continue

            if instr.op == "RULE_START":
                rule_effect, subject, action, resource = instr.args
                if self._matches(context, subject, action, resource):
                    rule_reasons, idx = self._walk_rule(idx + 1)
                    if rule_reasons is not None:
                        reasons.extend(rule_reasons)
                        return rule_effect, self._reason_panel(rule_effect, reasons)
                else:
                    idx = self._skip_rule(idx + 1)
                continue

            if instr.op == "DEFAULT_DENY":
                reasons.append(self._clause("fallback", "no matching rules"))
                return "deny", self._reason_panel("deny", reasons)

            idx += 1

        return "deny", self._reason_panel("deny", reasons)

    def _walk_rule(self, start_idx: int) -> tuple[list[dict[str, Any]] | None, int]:
        reasons: list[dict[str, Any]] = []
        idx = start_idx
        while idx < len(self.bytecode):
            instr = self.bytecode[idx]
            if instr.op == "RULE_START" or instr.op == "DEFAULT_DENY":
                break
            if instr.op == "CHECK_CONDITION":
                field, operator, expected = instr.args
                if not self._check_condition(field, operator, expected):
                    idx = self._skip_rule(idx + 1)
                    return None, idx
                reasons.append(self._clause(field, f"{operator} {expected}"))
            if instr.op == "EFFECT":
                reasons.append(self._clause("rule-match", instr.args[0]))
                return reasons, idx + 1
            idx += 1
        return None, idx

    def _skip_rule(self, idx: int) -> int:
        while idx < len(self.bytecode):
            if self.bytecode[idx].op in {"RULE_START", "DEFAULT_DENY"}:
                return idx
            idx += 1
        return idx

    def _check_condition(self, field: str, operator: str, expected: str) -> bool:
        value = self._context.get(field)
        if operator == "==":
            return value == expected
        if operator == "in":
            if value is None:
                return False
            return str(value) in [v.strip() for v in expected.split(",")]
        if operator == "<=":
            try:
                return self._parse_duration(value) <= self._parse_duration(expected)
            except Exception:
                return False
        if operator == ">=":
            try:
                return self._parse_duration(value) >= self._parse_duration(expected)
            except Exception:
                return False
        return False

    def _matches(self, context: dict[str, Any], subject: str, action: str, resource: str) -> bool:
        self._context = context
        return (
            self._match_token(context.get("subject"), subject)
            and self._match_token(context.get("action"), action)
            and self._match_token(context.get("resource"), resource)
        )

    def _match_token(self, value: str, expected: str) -> bool:
        return expected == "*" or value == expected

    def _retention_allows(self, candidate: str, ceiling: str) -> bool:
        try:
            return self._parse_duration(candidate) <= self._parse_duration(ceiling)
        except Exception:
            return False

    def _parse_duration(self, value: str):
        if value is None:
            raise ValueError("Missing retention")
        num = int(value[:-1])
        unit = value[-1].lower()
        if unit == "d":
            return timedelta(days=num)
        if unit == "h":
            return timedelta(hours=num)
        if unit == "m":
            return timedelta(minutes=num)
        raise ValueError(f"Unsupported duration: {value}")

    def _clause(self, field: str, detail: Any) -> dict[str, Any]:
        return {"field": field, "detail": detail}

    def _reason(
        self, code: str, reasons: list[dict[str, Any]], instr: BytecodeInstruction
    ) -> dict[str, Any]:
        reasons.append({"field": instr.op.lower(), "detail": instr.description or instr.op})
        return self._reason_panel("deny", reasons, code=code)

    def _reason_panel(
        self, decision: str, reasons: list[dict[str, Any]], code: str | None = None
    ) -> dict[str, Any]:
        panel = {
            "decision": decision,
            "clauses": reasons,
            "appeal": "Contact data steward with legal basis evidence.",
        }
        if code:
            panel["code"] = code
        return panel
