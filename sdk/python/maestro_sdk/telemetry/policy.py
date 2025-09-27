from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable, List, Literal, Protocol, Sequence
import re

from .detectors import DetectorFinding

PolicyAction = Literal['allow', 'deny', 'redact', 'hash']


@dataclass
class PolicyDecision:
    action: PolicyAction
    reason: str | None = None
    block_event: bool = False


class PolicyPlugin(Protocol):
    def evaluate(self, field_path: str, value: object, findings: Sequence[DetectorFinding]) -> PolicyDecision | None:
        ...


def _compile(pattern: str) -> re.Pattern[str]:
    escaped = re.escape(pattern).replace("\\*", ".*")
    return re.compile(f"^{escaped}$")


def _normalize_patterns(patterns: Iterable[str] | None) -> List[str]:
    if not patterns:
        return ["**"]
    expanded: set[str] = set()
    for pattern in patterns:
        expanded.add(pattern)
        if "*" not in pattern and "." not in pattern:
            expanded.add(f"**.{pattern}")
    return list(expanded)


class _FieldPatternPlugin:
    def __init__(
        self,
        action: PolicyAction,
        patterns: Iterable[str],
        *,
        reason: str | None = None,
        require_findings: bool = False,
        block_event: bool = False,
    ) -> None:
        self._action = action
        self._reason = reason
        self._require_findings = require_findings
        self._block_event = block_event
        self._matchers = [_compile(pattern) for pattern in _normalize_patterns(patterns)]

    def evaluate(self, field_path: str, value: object, findings: Sequence[DetectorFinding]) -> PolicyDecision | None:
        if self._require_findings and not findings:
            return None
        if not any(matcher.match(field_path) for matcher in self._matchers):
            return None
        return PolicyDecision(self._action, self._reason, self._block_event)


class AllowPlugin(_FieldPatternPlugin):
    def __init__(self, patterns: Iterable[str] | None = None, reason: str | None = None) -> None:
        super().__init__("allow", patterns or ["**"], reason=reason)


class DenyPlugin(_FieldPatternPlugin):
    def __init__(self, patterns: Iterable[str], reason: str | None = None, block_event: bool = True) -> None:
        super().__init__("deny", patterns, reason=reason, block_event=block_event)


class RedactPlugin(_FieldPatternPlugin):
    def __init__(self, patterns: Iterable[str], reason: str | None = None) -> None:
        super().__init__("redact", patterns, reason=reason)


class HashPlugin(_FieldPatternPlugin):
    def __init__(self, patterns: Iterable[str], reason: str | None = None) -> None:
        super().__init__("hash", patterns, reason=reason)


class PIIRedactPlugin:
    def __init__(self, action: PolicyAction = "redact", reason: str = "pii-detected") -> None:
        self._action = action
        self._reason = reason

    def evaluate(self, field_path: str, value: object, findings: Sequence[DetectorFinding]) -> PolicyDecision | None:
        if isinstance(value, str) and findings:
            return PolicyDecision(self._action, self._reason)
        return None


@dataclass
class PolicyConfig:
    allow: Sequence[str] | None = None
    deny: Sequence[str] | None = None
    redact: Sequence[str] | None = None
    hash: Sequence[str] | None = None
    default_action: PolicyAction = "allow"


class PolicyEngine:
    def __init__(self, plugins: Sequence[PolicyPlugin], default_action: PolicyAction = "allow") -> None:
        self._plugins = list(plugins)
        self._default_action = default_action

    def decide(self, field_path: str, value: object, findings: Sequence[DetectorFinding]) -> PolicyDecision:
        for plugin in self._plugins:
            decision = plugin.evaluate(field_path, value, findings)
            if decision is not None:
                return decision
        return PolicyDecision(self._default_action, "default-policy")


def create_policy_pipeline(config: PolicyConfig | None = None) -> PolicyEngine:
    config = config or PolicyConfig()
    plugins: List[PolicyPlugin] = []
    if config.deny:
        plugins.append(DenyPlugin(config.deny, "denylist"))
    if config.hash:
        plugins.append(HashPlugin(config.hash, "hashlist"))
    if config.redact:
        plugins.append(RedactPlugin(config.redact, "redactlist"))
    plugins.append(PIIRedactPlugin())
    if config.allow:
        plugins.append(AllowPlugin(config.allow, "allowlist"))
    return PolicyEngine(plugins, config.default_action)
