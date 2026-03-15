import argparse
import sys
from summit.risk.alerting_engine import AlertingEngine

class RiskAlertCLI:
    def __init__(self, engine: AlertingEngine):
        self.engine = engine

    def list_alerts(self, args):
        alerts = self.engine.get_current_alerts()
        if args.type:
            alerts = [a for a in alerts if a.subject_type == args.type.upper()]

        for alert in alerts:
            print(f"[{alert.alert_id}] {alert.subject_type}: {alert.subject_id} - Level: {alert.alert_level.value}")
            print(f"  Reasons: {alert.reasons}")
            print(f"  Status: {alert.status}")

    def update_alert(self, args):
        success = self.engine.update_alert_status(args.id, args.status.upper())
        if success:
            print(f"Updated {args.id} to {args.status.upper()}")
        else:
            print(f"Alert {args.id} not found")

def main():
    # In real app, load engine state
    engine = AlertingEngine()
    cli = RiskAlertCLI(engine)

    parser = argparse.ArgumentParser(description="Summit Risk Alerts CLI")
    subparsers = parser.add_subparsers(dest="command")

    list_parser = subparsers.add_parser("list", help="List current risk alerts")
    list_parser.add_argument("--type", choices=["persona", "campaign"], help="Filter by type")

    update_parser = subparsers.add_parser("update", help="Update alert status")
    update_parser.add_argument("id", help="Alert ID")
    update_parser.add_argument("status", choices=["new", "in_review", "handled"], help="New status")

    args = parser.parse_args()
    if args.command == "list":
        cli.list_alerts(args)
    elif args.command == "update":
        cli.update_alert(args)

if __name__ == "__main__":
    main()
