"""Detection rules for SecretSentry."""

from __future__ import annotations

import re
from dataclasses import dataclass
from re import Pattern


@dataclass(frozen=True)
class PatternRule:
    """Regular expression based rule."""

    name: str
    description: str
    regex: Pattern[str]
    severity: str = "high"

    def finditer(self, text: str):
        return self.regex.finditer(text)


PATTERN_RULES: tuple[PatternRule, ...] = (
    PatternRule(
        name="AWS Access Key",
        description="AWS access key ID",
        regex=re.compile(r"\b(AKIA|ASIA|ANPA|AROA|AIDA|AGPA)[A-Z0-9]{16}\b"),
    ),
    PatternRule(
        name="AWS Secret Key",
        description="AWS secret access key",
        regex=re.compile(r"\b[A-Za-z0-9/+=]{40}\b"),
    ),
    PatternRule(
        name="GitHub Token",
        description="GitHub personal access token",
        regex=re.compile(r"\bgh[pousr]_[A-Za-z0-9]{36}\b"),
    ),
    PatternRule(
        name="Google API Key",
        description="Google API key",
        regex=re.compile(r"\bAIza[0-9A-Za-z\-_]{35}\b"),
    ),
    PatternRule(
        name="Stripe Secret Key",
        description="Stripe secret key",
        regex=re.compile(r"\bsk_(live|test)_[0-9a-zA-Z]{24}\b"),
    ),
    PatternRule(
        name="Slack Token",
        description="Slack legacy token",
        regex=re.compile(r"\bxox[aboprs]-[0-9A-Za-z-]{10,48}\b"),
    ),
    PatternRule(
        name="OAuth Client Secret",
        description="Generic OAuth client secret",
        regex=re.compile(r"\b(?:(?:ya29\.[0-9A-Za-z\-_]+)|(?:EAACEdEose0cBA[0-9A-Za-z]+))\b"),
    ),
    PatternRule(
        name="JWT",
        description="JSON Web Token",
        regex=re.compile(r"\beyJ[0-9A-Za-z_-]+\.[0-9A-Za-z_-]+\.[0-9A-Za-z_-]{10,}\b"),
        severity="medium",
    ),
)


DEFAULT_IGNORES: tuple[str, ...] = (
    "**/.git/**",
    "**/.hg/**",
    "**/node_modules/**",
    "**/vendor/**",
    "**/.venv/**",
    "**/.mypy_cache/**",
    "**/.pytest_cache/**",
    "**/dist/**",
)
