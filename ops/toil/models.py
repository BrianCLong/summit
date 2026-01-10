from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass, field
from datetime import datetime, timedelta


@dataclass
class ToilEntry:
    service: str
    team: str
    person: str
    category: str
    minutes: int
    severity: int
    timestamp: datetime
    after_hours: bool
    alert_source: str | None = None
    mtta_minutes: int | None = None
    mttr_minutes: int | None = None
    notes: str | None = None

    def cost_score(self) -> int:
        return self.minutes * max(self.severity, 1)


@dataclass
class ToilBudget:
    team: str
    max_hours_per_person: int
    team_size: int

    def breached_by(self, total_minutes: int) -> bool:
        return total_minutes > self.max_hours_per_person * 60 * self.team_size


@dataclass
class AlertMetadata:
    id: str
    name: str
    severity: str
    service: str
    owner: str
    runbook: str
    taxonomy: str
    description: str | None = None
    replace_alert_id: str | None = None
    multi_signal: bool = False
    suppression_until: datetime | None = None
    suppression_reason: str | None = None
    last_false_positive_events: int = 0
    total_pages: int = 0
    total_page_minutes: int = 0
    sources: set[str] = field(default_factory=set)

    def register_page(self, duration_minutes: int, false_positive: bool = False) -> None:
        self.total_pages += 1
        self.total_page_minutes += duration_minutes
        if false_positive:
            self.last_false_positive_events += 1

    @property
    def false_positive_rate(self) -> float:
        if self.total_pages == 0:
            return 0.0
        return self.last_false_positive_events / self.total_pages


@dataclass
class ExceptionEntry:
    name: str
    owner: str
    reason: str
    expires_at: datetime
    created_at: datetime = field(default_factory=datetime.utcnow)

    def is_expired(self, now: datetime | None = None) -> bool:
        now = now or datetime.utcnow()
        return now >= self.expires_at

    def needs_reminder(self, lead_time: timedelta) -> bool:
        return 0 <= (self.expires_at - datetime.utcnow()).days <= lead_time.days


@dataclass
class RemediationResult:
    action: str
    target: str
    success: bool
    dry_run: bool
    verification: str
    details: str
    timestamp: datetime = field(default_factory=datetime.utcnow)


@dataclass
class RemediationActionDefinition:
    name: str
    description: str
    handler: Callable[[str, bool], RemediationResult]
    verification_steps: list[str]

    def execute(self, target: str, dry_run: bool) -> RemediationResult:
        return self.handler(target, dry_run)


@dataclass
class ChatOpsCommand:
    name: str
    description: str
    allowed_roles: set[str]
    remediation_action: str


@dataclass
class ReleaseEnvelope:
    service: str
    tier: str
    version: str
    canary_percentage: int
    ramp_steps: int
    rollback_plan: str
    verification_tests: list[str]
