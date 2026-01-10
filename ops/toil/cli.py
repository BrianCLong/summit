from __future__ import annotations

import argparse
from datetime import datetime
from pathlib import Path

from .models import AlertMetadata, ExceptionEntry, ReleaseEnvelope, ToilEntry
from .registry import (
    AlertRegistry,
    DashboardBuilder,
    ExceptionsRegistry,
    ReleaseSafetyEnforcer,
    ToilDiary,
)


def parse_datetime(value: str) -> datetime:
    return datetime.fromisoformat(value)


def build_diary(args: argparse.Namespace) -> ToilDiary:
    return ToilDiary(Path(args.storage) / "toil_diary.json")


def build_alerts(args: argparse.Namespace) -> AlertRegistry:
    return AlertRegistry(Path(args.storage) / "alerts.json")


def build_exceptions(args: argparse.Namespace) -> ExceptionsRegistry:
    return ExceptionsRegistry(Path(args.storage) / "exceptions.json")


def command_add_entry(args: argparse.Namespace) -> None:
    diary = build_diary(args)
    entry = ToilEntry(
        service=args.service,
        team=args.team,
        person=args.person,
        category=args.category,
        minutes=args.minutes,
        severity=args.severity,
        timestamp=parse_datetime(args.timestamp),
        after_hours=args.after_hours,
        alert_source=args.alert_source,
        mtta_minutes=args.mtta,
        mttr_minutes=args.mttr,
        notes=args.notes,
    )
    diary.add_entry(entry)
    print("Entry recorded")


def command_add_alert(args: argparse.Namespace) -> None:
    alerts = build_alerts(args)
    alert = AlertMetadata(
        id=args.id,
        name=args.name,
        severity=args.severity,
        service=args.service,
        owner=args.owner,
        runbook=args.runbook,
        taxonomy=args.taxonomy,
        description=args.description,
        replace_alert_id=args.replace,
        multi_signal=args.multi_signal,
    )
    alerts.add_alert(alert)
    print("Alert registered")


def command_record_page(args: argparse.Namespace) -> None:
    alerts = build_alerts(args)
    alerts.record_page(
        args.id, args.minutes, false_positive=args.false_positive, source=args.source
    )
    print("Page recorded")


def command_dashboard(args: argparse.Namespace) -> None:
    diary = build_diary(args)
    alerts = build_alerts(args)
    exceptions = build_exceptions(args)
    dashboard = DashboardBuilder(diary, alerts, exceptions).build()
    print(dashboard)


def command_exception(args: argparse.Namespace) -> None:
    registry = build_exceptions(args)
    entry = ExceptionEntry(
        name=args.name,
        owner=args.owner,
        reason=args.reason,
        expires_at=parse_datetime(args.expires_at),
    )
    registry.add(entry)
    print("Exception registered")


def command_release(args: argparse.Namespace) -> None:
    envelope = ReleaseEnvelope(
        service=args.service,
        tier=args.tier,
        version=args.version,
        canary_percentage=args.canary,
        ramp_steps=args.ramp_steps,
        rollback_plan=args.rollback,
        verification_tests=args.verify,
    )
    ReleaseSafetyEnforcer().validate(envelope)
    print("Release envelope validated")


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Toil governance and alert rationalization toolkit"
    )
    parser.add_argument("--storage", default="ops/state", help="Directory for persisted state")
    sub = parser.add_subparsers(dest="command", required=True)

    add_entry = sub.add_parser("add-entry", help="Record a toil diary entry")
    add_entry.add_argument("--service", required=True)
    add_entry.add_argument("--team", required=True)
    add_entry.add_argument("--person", required=True)
    add_entry.add_argument("--category", required=True)
    add_entry.add_argument("--minutes", required=True, type=int)
    add_entry.add_argument("--severity", required=True, type=int)
    add_entry.add_argument("--timestamp", required=True)
    add_entry.add_argument("--after-hours", action="store_true", dest="after_hours")
    add_entry.add_argument("--alert-source")
    add_entry.add_argument("--mtta", type=int)
    add_entry.add_argument("--mttr", type=int)
    add_entry.add_argument("--notes")
    add_entry.set_defaults(func=command_add_entry)

    add_alert = sub.add_parser("add-alert", help="Register an alert with metadata and runbook")
    add_alert.add_argument("--id", required=True)
    add_alert.add_argument("--name", required=True)
    add_alert.add_argument("--severity", required=True)
    add_alert.add_argument("--service", required=True)
    add_alert.add_argument("--owner", required=True)
    add_alert.add_argument("--runbook", required=True)
    add_alert.add_argument("--taxonomy", required=True)
    add_alert.add_argument("--description")
    add_alert.add_argument("--replace")
    add_alert.add_argument("--multi-signal", action="store_true", dest="multi_signal")
    add_alert.set_defaults(func=command_add_alert)

    record_page = sub.add_parser("record-page", help="Record a page event and cost")
    record_page.add_argument("--id", required=True)
    record_page.add_argument("--minutes", required=True, type=int)
    record_page.add_argument("--false-positive", action="store_true", dest="false_positive")
    record_page.add_argument("--source")
    record_page.set_defaults(func=command_record_page)

    dash = sub.add_parser("dashboard", help="Render a snapshot dashboard of toil and alerts")
    dash.set_defaults(func=command_dashboard)

    exception = sub.add_parser("exception", help="Register a manual exception with expiry")
    exception.add_argument("--name", required=True)
    exception.add_argument("--owner", required=True)
    exception.add_argument("--reason", required=True)
    exception.add_argument("--expires-at", required=True, dest="expires_at")
    exception.set_defaults(func=command_exception)

    release = sub.add_parser("release", help="Validate release envelope for rollback readiness")
    release.add_argument("--service", required=True)
    release.add_argument("--tier", required=True)
    release.add_argument("--version", required=True)
    release.add_argument("--canary", required=True, type=int)
    release.add_argument("--ramp-steps", required=True, type=int, dest="ramp_steps")
    release.add_argument("--rollback", required=True)
    release.add_argument("--verify", nargs="+", required=True)
    release.set_defaults(func=command_release)

    return parser


def main(argv: list[str] | None = None) -> None:
    parser = build_parser()
    args = parser.parse_args(argv)
    args.func(args)


if __name__ == "__main__":
    main()
