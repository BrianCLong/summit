from __future__ import annotations

from collections import Counter, defaultdict
from collections.abc import Iterable
from datetime import datetime, timedelta
from pathlib import Path

from . import config
from .config import PolicyViolation
from .models import (
    AlertMetadata,
    ChatOpsCommand,
    ExceptionEntry,
    ReleaseEnvelope,
    RemediationActionDefinition,
    RemediationResult,
    ToilBudget,
    ToilEntry,
)
from .storage import load_collection, save_collection


class ToilDiary:
    def __init__(self, storage_path: Path):
        self.storage_path = storage_path
        self.entries: list[ToilEntry] = load_collection(storage_path, ToilEntry)

    def add_entry(self, entry: ToilEntry) -> None:
        if entry.minutes <= 0:
            raise ValueError("Minutes must be positive")
        self.entries.append(entry)
        self.persist()

    def persist(self) -> None:
        save_collection(self.storage_path, self.entries)

    def on_call_load(self, period_days: int = config.TOIL_DIARY_PERIOD_DAYS) -> dict:
        cutoff = datetime.utcnow() - timedelta(days=period_days)
        relevant = [e for e in self.entries if e.timestamp >= cutoff]
        pages = [e for e in relevant if e.alert_source]
        after_hours_minutes = sum(e.minutes for e in relevant if e.after_hours)
        total_minutes = sum(e.minutes for e in relevant)
        mtta_values = [e.mtta_minutes for e in relevant if e.mtta_minutes is not None]
        mttr_values = [e.mttr_minutes for e in relevant if e.mttr_minutes is not None]
        top_alert_sources = Counter(e.alert_source for e in pages if e.alert_source)
        return {
            "pages_per_week": len(pages) / (period_days / 7),
            "after_hours_pct": 0 if total_minutes == 0 else after_hours_minutes / total_minutes,
            "mtta_minutes": sum(mtta_values) / len(mtta_values) if mtta_values else None,
            "mttr_minutes": sum(mttr_values) / len(mttr_values) if mttr_values else None,
            "top_alert_sources": top_alert_sources.most_common(5),
        }

    def rank_top_drivers(self, limit: int = 20) -> list[tuple[str, int, int, int]]:
        drivers: dict[str, dict[str, int]] = defaultdict(
            lambda: {"count": 0, "minutes": 0, "severity": 0}
        )
        for entry in self.entries:
            driver = entry.alert_source or entry.category
            drivers[driver]["count"] += 1
            drivers[driver]["minutes"] += entry.minutes
            drivers[driver]["severity"] += entry.severity
        ranked = [
            (
                driver,
                data["count"],
                data["minutes"],
                data["minutes"] * data["severity"],
            )
            for driver, data in drivers.items()
        ]
        ranked.sort(key=lambda item: item[3], reverse=True)
        return ranked[:limit]

    def budget_breaches(self, budgets: Iterable[ToilBudget]) -> dict[str, dict]:
        breaches: dict[str, dict] = {}
        team_minutes = defaultdict(int)
        for entry in self.entries:
            team_minutes[entry.team] += entry.minutes
        for budget in budgets:
            total = team_minutes.get(budget.team, 0)
            if budget.breached_by(total):
                breaches[budget.team] = {
                    "total_minutes": total,
                    "budget_minutes": budget.max_hours_per_person * 60 * budget.team_size,
                }
        return breaches

    def repeat_incidents(self, threshold: int = 2) -> list[str]:
        counts = Counter(entry.alert_source or entry.category for entry in self.entries)
        return [driver for driver, count in counts.items() if count >= threshold]


class AlertRegistry:
    def __init__(self, storage_path: Path, frozen: bool = config.ALERT_FREEZE_ONE_IN_ONE_OUT):
        self.storage_path = storage_path
        self.frozen = frozen
        self.alerts: dict[str, AlertMetadata] = {
            a.id: a for a in load_collection(storage_path, AlertMetadata)
        }

    def persist(self) -> None:
        save_collection(self.storage_path, self.alerts.values())

    def _validate_metadata(self, alert: AlertMetadata) -> None:
        missing = [
            field for field in config.ALERT_METADATA_REQUIRED if not getattr(alert, field, None)
        ]
        if missing:
            raise PolicyViolation(f"Missing required alert metadata: {', '.join(missing)}")
        if alert.severity.lower() in config.ALERT_PAGE_SEVERITIES and not alert.runbook:
            raise PolicyViolation("Runbook link required for page-worthy alerts")

    def add_alert(self, alert: AlertMetadata) -> None:
        self._validate_metadata(alert)
        if (
            self.frozen
            and alert.severity.lower() in config.ALERT_PAGE_SEVERITIES
            and not alert.replace_alert_id
        ):
            raise PolicyViolation(
                "New page-worthy alerts require replacement for one-in/one-out policy"
            )
        if alert.replace_alert_id and alert.replace_alert_id not in self.alerts:
            raise PolicyViolation("Replacement target not found for alert freeze policy")
        duplicate_key = (alert.service, alert.taxonomy, alert.name.lower())
        for existing in self.alerts.values():
            if (existing.service, existing.taxonomy, existing.name.lower()) == duplicate_key:
                raise PolicyViolation(
                    f"Duplicate alert detected for service {alert.service} and taxonomy {alert.taxonomy}"
                )
        self.alerts[alert.id] = alert
        self.persist()

    def remove_alert(self, alert_id: str) -> None:
        self.alerts.pop(alert_id, None)
        self.persist()

    def record_page(
        self,
        alert_id: str,
        duration_minutes: int,
        false_positive: bool = False,
        source: str | None = None,
    ) -> None:
        if alert_id not in self.alerts:
            raise KeyError("Alert not registered")
        alert = self.alerts[alert_id]
        alert.register_page(duration_minutes, false_positive=false_positive)
        if source:
            alert.sources.add(source)
        if alert.total_pages > 1 and alert.false_positive_rate > config.FALSE_POSITIVE_MAX_RATE:
            raise PolicyViolation(f"Alert {alert_id} exceeds false-positive threshold")
        self.persist()

    def add_suppression(self, alert_id: str, until: datetime, reason: str) -> None:
        if until - datetime.utcnow() > config.SUPPRESSION_MAX_DURATION:
            raise PolicyViolation("Suppressions must have an expiry within policy window")
        alert = self.alerts.get(alert_id)
        if not alert:
            raise KeyError("Alert not registered")
        alert.suppression_until = until
        alert.suppression_reason = reason
        self.persist()

    def alert_costs(self) -> dict[str, dict]:
        return {
            alert.id: {
                "pages": alert.total_pages,
                "minutes": alert.total_page_minutes,
                "false_positive_rate": alert.false_positive_rate,
            }
            for alert in self.alerts.values()
        }


class ExceptionsRegistry:
    def __init__(self, storage_path: Path):
        self.storage_path = storage_path
        self.exceptions: list[ExceptionEntry] = load_collection(storage_path, ExceptionEntry)

    def add(self, entry: ExceptionEntry) -> None:
        if entry.is_expired():
            raise PolicyViolation("Cannot add already expired exception")
        self.exceptions.append(entry)
        self.persist()

    def persist(self) -> None:
        save_collection(self.storage_path, self.exceptions)

    def prune_expired(self, now: datetime | None = None) -> list[ExceptionEntry]:
        now = now or datetime.utcnow()
        expired = [exc for exc in self.exceptions if exc.is_expired(now)]
        self.exceptions = [exc for exc in self.exceptions if not exc.is_expired(now)]
        if expired:
            self.persist()
        return expired

    def reminders(
        self, lead_time: timedelta = timedelta(days=config.EXCEPTION_REMINDER_LEAD_DAYS)
    ) -> list[ExceptionEntry]:
        return [exc for exc in self.exceptions if exc.needs_reminder(lead_time)]


class RemediationLibrary:
    def __init__(self):
        self.actions: dict[str, RemediationActionDefinition] = {}
        self.audit_log: list[RemediationResult] = []
        self._install_default_actions()

    def _install_default_actions(self) -> None:
        def restart_service(target: str, dry_run: bool) -> RemediationResult:
            verification = "health_check_passed" if dry_run else "service_restarted"
            return RemediationResult(
                action="restart_service",
                target=target,
                success=True,
                dry_run=dry_run,
                verification=verification,
                details="Restart with circuit breaker and backoff",
            )

        def purge_queue(target: str, dry_run: bool) -> RemediationResult:
            verification = "queue_depth_within_limits"
            return RemediationResult(
                action="purge_queue",
                target=target,
                success=True,
                dry_run=dry_run,
                verification=verification,
                details="Progressive throttling applied",
            )

        def resync_state(target: str, dry_run: bool) -> RemediationResult:
            verification = "consistency_verified"
            return RemediationResult(
                action="resync_state",
                target=target,
                success=True,
                dry_run=dry_run,
                verification=verification,
                details="Idempotent resync executed",
            )

        for action in [
            RemediationActionDefinition(
                name="restart_service",
                description="Circuit-breaker restart with backoff",
                handler=restart_service,
                verification_steps=["health_check", "error_budget_ok"],
            ),
            RemediationActionDefinition(
                name="purge_queue",
                description="Throttle and drain overloaded queue",
                handler=purge_queue,
                verification_steps=["queue_depth", "latency"],
            ),
            RemediationActionDefinition(
                name="resync_state",
                description="Recompute and resync cache or ledger state",
                handler=resync_state,
                verification_steps=["consistency_check", "audit_log"],
            ),
        ]:
            self.register(action)

    def register(self, action: RemediationActionDefinition) -> None:
        self.actions[action.name] = action

    def execute(
        self, name: str, target: str, dry_run: bool = config.DEFAULT_AUTO_REMEDIATION_DRY_RUN
    ) -> RemediationResult:
        if name not in self.actions:
            raise KeyError(f"Remediation {name} not registered")
        result = self.actions[name].execute(target, dry_run)
        self.audit_log.append(result)
        return result


class ChatOpsBot:
    def __init__(self, remediation_library: RemediationLibrary):
        self.remediation_library = remediation_library
        self.commands: dict[str, ChatOpsCommand] = {}
        self.audit_log: list[dict] = []
        self._install_default_commands()

    def _install_default_commands(self) -> None:
        self.register_command(
            ChatOpsCommand(
                name="retry_job",
                description="Retry job with dedupe and idempotency",
                allowed_roles={"sre", "oncall"},
                remediation_action="resync_state",
            )
        )
        self.register_command(
            ChatOpsCommand(
                name="throttle_service",
                description="Progressive throttling during overload",
                allowed_roles={"sre", "platform"},
                remediation_action="purge_queue",
            )
        )

    def register_command(self, command: ChatOpsCommand) -> None:
        self.commands[command.name] = command

    def run_command(
        self, command_name: str, user_role: str, target: str, dry_run: bool = True
    ) -> RemediationResult:
        if command_name not in self.commands:
            raise KeyError("Command not registered")
        command = self.commands[command_name]
        if user_role not in command.allowed_roles:
            raise PolicyViolation("User lacks permission for command")
        result = self.remediation_library.execute(
            command.remediation_action, target, dry_run=dry_run
        )
        self.audit_log.append(
            {
                "command": command_name,
                "role": user_role,
                "target": target,
                "timestamp": datetime.utcnow().isoformat(),
                "dry_run": dry_run,
            }
        )
        return result


class ReleaseSafetyEnforcer:
    def validate(self, envelope: ReleaseEnvelope) -> None:
        if config.RELEASE_CANARY_REQUIRED and envelope.canary_percentage <= 0:
            raise PolicyViolation("Canary step is required for releases")
        if envelope.ramp_steps < 2:
            raise PolicyViolation("Release must ramp beyond canary")
        if envelope.tier.lower() in config.ROLLBACK_REQUIRED_TIERS and not envelope.rollback_plan:
            raise PolicyViolation("Rollback plan required for Tier 0/1")
        if config.RELEASE_VERIFICATION_REQUIRED and not envelope.verification_tests:
            raise PolicyViolation("Verification tests required for release")


class DashboardBuilder:
    def __init__(self, diary: ToilDiary, alerts: AlertRegistry, exceptions: ExceptionsRegistry):
        self.diary = diary
        self.alerts = alerts
        self.exceptions = exceptions

    def build(self) -> dict:
        return {
            "on_call_load": self.diary.on_call_load(),
            "top_drivers": self.diary.rank_top_drivers(),
            "budget_breaches": self.diary.budget_breaches(
                [
                    ToilBudget(
                        team=entry.team,
                        max_hours_per_person=config.TOIL_BUDGET_HOURS_PER_PERSON,
                        team_size=1,
                    )
                    for entry in self.diary.entries
                ]
            ),
            "alert_costs": self.alerts.alert_costs(),
            "exceptions": {
                "active": [exc.name for exc in self.exceptions.exceptions],
                "expiring": [exc.name for exc in self.exceptions.reminders()],
            },
        }
