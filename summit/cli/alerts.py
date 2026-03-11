import argparse
import sys
from datetime import datetime

from summit.risk.alerting_engine import AlertState, RiskAlertingEngine

# In a real system, this engine instance would be initialized and persisted centrally.
# For demonstration in the CLI, we mock a populated engine.
_engine = RiskAlertingEngine()

def populate_mock_data():
    from summit.risk.alerting_engine import RiskEvent
    from summit.risk.persona_campaign_risk import RiskLevel
    from datetime import timezone; base_time = datetime.now(timezone.utc)
    _engine.record_risk_event(RiskEvent("PERSONA", "usr_1234", 80.0, RiskLevel.CRITICAL, base_time))
    _engine.record_risk_event(RiskEvent("CAMPAIGN", "cmp_5678", 50.0, RiskLevel.HIGH, base_time))

def _print_alert(alert):
    print("-" * 40)
    print(f"Alert ID:     {alert.alert_id}")
    print(f"Subject:      {alert.subject_type} / {alert.subject_id}")
    print(f"Level:        {alert.alert_level.value}")
    print(f"State:        {alert.state.value}")
    print(f"Window:       {alert.window}s")
    print("Reasons:")
    for reason in alert.reasons:
        print(f"  - {reason}")
    print("Links:")
    if alert.subject_type == "PERSONA":
        print(f"  - /workbench/persona/{alert.subject_id}")
    elif alert.subject_type == "CAMPAIGN":
        print(f"  - /workbench/campaign/{alert.subject_id}")

def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description="Summit Risk-Based Alerts CLI")
    subparsers = parser.add_subparsers(dest="command", required=True)

    # list command
    list_parser = subparsers.add_parser("list", help="List active alerts")
    list_parser.add_argument("--type", choices=["PERSONA", "CAMPAIGN"], help="Filter by subject type")
    list_parser.add_argument("--state", choices=["NEW", "IN_REVIEW", "HANDLED"], help="Filter by alert state")

    # update command
    update_parser = subparsers.add_parser("update", help="Update alert state")
    update_parser.add_argument("alert_id", help="ID of the alert to update")
    update_parser.add_argument("--state", choices=["NEW", "IN_REVIEW", "HANDLED"], required=True, help="New alert state")
    update_parser.add_argument("--notes", default="", help="Optional notes for the state transition")

    args = parser.parse_args(argv[1:])

    populate_mock_data()

    if args.command == "list":
        state_filter = AlertState(args.state) if args.state else None
        alerts = _engine.get_current_alerts(subject_type=args.type, state=state_filter)
        if not alerts:
            print("No alerts found matching the criteria.")
            return 0

        print(f"Found {len(alerts)} alerts:")
        for alert in alerts:
            _print_alert(alert)
        return 0

    elif args.command == "update":
        new_state = AlertState(args.state)
        # Mock finding the alert since the engine is initialized fresh
        alerts = _engine.get_current_alerts()
        alert_exists = any(a.alert_id == args.alert_id for a in alerts)

        if not alert_exists:
            print(f"Error: Alert {args.alert_id} not found.")
            return 1

        success = _engine.update_alert_state(args.alert_id, new_state, actor="cli_user", notes=args.notes)
        if success:
            print(f"Successfully updated alert {args.alert_id} to {new_state.value}.")
            return 0
        else:
            print(f"Failed to update alert {args.alert_id}.")
            return 1

    return 1

if __name__ == "__main__":
    sys.exit(main(sys.argv))
