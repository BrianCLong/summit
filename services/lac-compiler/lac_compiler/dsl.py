import re

from .models import Condition, PolicyIR, Rule

_DIRECTIVE_PATTERN = re.compile(
    r"^(?P<key>license|legal_basis|purpose|retention|name)\s*:\s*(?P<value>.+)$", re.IGNORECASE
)
_RULE_PATTERN = re.compile(
    r"^(?P<effect>allow|deny)\s+(?P<subject>\S+)\s+(?P<action>\S+)\s+(?P<resource>\S+)(?:\s+when\s+(?P<condition>.+))?$",
    re.IGNORECASE,
)
_CONDITION_PATTERN = re.compile(r"(?P<field>\w+)\s*(?P<op>==|<=|>=|in)\s*(?P<value>.+)")


class DSLParseError(ValueError):
    """Raised when DSL content is invalid."""


class PolicyDSLParser:
    """Parses the lightweight policy DSL into an IR representation."""

    def parse(self, text: str) -> PolicyIR:
        rules: list[Rule] = []
        metadata = {"purposes": []}

        for raw_line in text.splitlines():
            line = raw_line.strip()
            if not line or line.startswith("#"):
                continue

            directive_match = _DIRECTIVE_PATTERN.match(line)
            if directive_match:
                key = directive_match.group("key").lower()
                value = directive_match.group("value").strip().strip('"')
                if key == "purpose":
                    metadata.setdefault("purposes", []).extend(
                        [item.strip() for item in re.split(r",|\s+", value) if item.strip()]
                    )
                else:
                    metadata[key] = value
                continue

            rule_match = _RULE_PATTERN.match(line)
            if rule_match:
                conditions_text = rule_match.group("condition")
                conditions: list[Condition] = []
                if conditions_text:
                    for chunk in re.split(r"\s+and\s+", conditions_text):
                        cond_match = _CONDITION_PATTERN.match(chunk.strip())
                        if not cond_match:
                            raise DSLParseError(f"Invalid condition: {chunk}")
                        value = cond_match.group("value").strip().strip('"')
                        conditions.append(
                            Condition(
                                field=cond_match.group("field"),
                                operator=cond_match.group("op"),
                                value=value,
                            )
                        )
                rules.append(
                    Rule(
                        effect=rule_match.group("effect").lower(),
                        subject=rule_match.group("subject"),
                        action=rule_match.group("action"),
                        resource=rule_match.group("resource"),
                        conditions=conditions,
                        description=conditions_text,
                    )
                )
                continue

            raise DSLParseError(f"Unrecognized statement: {line}")

        return PolicyIR(
            name=metadata.get("name"),
            license=metadata.get("license"),
            legal_basis=metadata.get("legal_basis"),
            purposes=metadata.get("purposes", []),
            retention=metadata.get("retention"),
            rules=rules,
        )
