"""Rule engine definitions for SPOM."""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Iterable, List

from .models import FieldObservation


@dataclass
class RuleMatch:
    """Represents a single rule contribution."""

    category: str
    weight: float
    reason: str
    feature: str


@dataclass
class Rule:
    """Rule definition."""

    pattern: re.Pattern[str]
    category: str
    weight: float
    reason: str
    feature: str

    def evaluate(self, value: str) -> RuleMatch | None:
        if not value:
            return None
        if self.pattern.search(value):
            return RuleMatch(
                category=self.category,
                weight=self.weight,
                reason=self.reason,
                feature=self.feature,
            )
        return None


NAME_RULES: List[Rule] = [
    Rule(re.compile(r"email"), "EMAIL", 0.7, "Field name contains 'email'", "name"),
    Rule(re.compile(r"phone|mobile"), "PHONE", 0.7, "Field name references phone", "name"),
    Rule(re.compile(r"ip(_)?address|client_ip|signup_ip"), "IP", 0.65, "Field name references IP address", "name"),
    Rule(re.compile(r"ssn|social[_\s]?security"), "GOV_ID", 0.8, "Field name references Social Security", "name"),
    Rule(re.compile(r"passport|driver"), "GOV_ID", 0.65, "Field name references government ID", "name"),
    Rule(re.compile(r"name"), "NAME", 0.55, "Field name references personal name", "name"),
    Rule(re.compile(r"address|street|city"), "ADDRESS", 0.55, "Field name references address", "name"),
    Rule(re.compile(r"token|jwt|session"), "ACCESS_TOKEN", 0.75, "Field name references token", "name"),
    Rule(re.compile(r"api[_-]?key|client[_-]?secret"), "API_KEY", 0.75, "Field name references API key", "name"),
    Rule(re.compile(r"card|payment|iban"), "PAYMENT_HINTS", 0.6, "Field name references payment", "name"),
]

VALUE_RULES: List[Rule] = [
    Rule(re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$"), "EMAIL", 0.7, "Sample value looks like an email", "sample"),
    Rule(
        re.compile(r"^(\+?\d{1,3}[\s-]?)?(\(?\d{3}\)?[\s-]?)?\d{3}[\s-]?\d{4}$"),
        "PHONE",
        0.7,
        "Sample value looks like a phone number",
        "sample",
    ),
    Rule(
        re.compile(r"^(\d{3}-\d{2}-\d{4}|\d{9})$"),
        "GOV_ID",
        0.75,
        "Sample value looks like a Social Security Number",
        "sample",
    ),
    Rule(
        re.compile(r"^((25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(25[0-5]|2[0-4]\d|[01]?\d\d?)$"),
        "IP",
        0.7,
        "Sample value looks like an IPv4 address",
        "sample",
    ),
    Rule(
        re.compile(r"^[0-9]{4} ?(?:[0-9]{4} ?){2,3}[0-9]{4}$"),
        "PAYMENT_HINTS",
        0.75,
        "Sample value looks like a payment card number",
        "sample",
    ),
]

DESCRIPTION_RULES: List[Rule] = [
    Rule(re.compile(r"email"), "EMAIL", 0.5, "Description references email", "description"),
    Rule(re.compile(r"phone|sms|contact"), "PHONE", 0.45, "Description references phone", "description"),
    Rule(re.compile(r"address"), "ADDRESS", 0.45, "Description references address", "description"),
    Rule(re.compile(r"name"), "NAME", 0.4, "Description references personal name", "description"),
    Rule(re.compile(r"government|compliance|id"), "GOV_ID", 0.55, "Description references government ID", "description"),
]


def evaluate_rules(field: FieldObservation) -> List[RuleMatch]:
    """Evaluate all rules against a field."""

    matches: List[RuleMatch] = []
    lowered_name = field.name.lower()
    for rule in NAME_RULES:
        match = rule.evaluate(lowered_name)
        if match:
            matches.append(match)

    lowered_description = field.description.lower()
    for rule in DESCRIPTION_RULES:
        match = rule.evaluate(lowered_description)
        if match:
            matches.append(match)

    for value in field.sample_values:
        lowered_value = value.lower()
        for rule in VALUE_RULES:
            match = rule.evaluate(lowered_value)
            if match:
                matches.append(match)
                break

    return matches


def summarise_matches(matches: Iterable[RuleMatch]) -> List[str]:
    """Return human-readable text for rule matches."""

    return [match.reason for match in matches]
