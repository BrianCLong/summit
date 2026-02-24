#!/usr/bin/env python3
"""
Drift detection script for OSINT second-order awareness.
Usage: python osint-second-order-awareness-drift.py --alerts-file alerts.json
"""
import argparse
import json
import sys
import os
from datetime import datetime, timedelta, timezone

# Ensure summit package is in path
sys.path.append(os.getcwd())

from summit.osint.meta_alerts import MetaAlertMonitor

def main():
    parser = argparse.ArgumentParser(description="Monitor for OSINT drift and meta-alerts")
    parser.add_argument("--alerts-file", help="Path to JSON file containing recent alerts")
    args = parser.parse_args()

    if not args.alerts_file or not os.path.exists(args.alerts_file):
        print("No alerts file provided or file not found.")
        sys.exit(1)

    with open(args.alerts_file, 'r') as f:
        alerts = json.load(f)

    # Assume window is last 24 hours
    window_start = (datetime.now(timezone.utc) - timedelta(hours=24)).isoformat()

    monitor = MetaAlertMonitor()
    meta_alerts = monitor.analyze_alerts(alerts, window_start)

    if meta_alerts:
        print(json.dumps(meta_alerts, indent=2))
        sys.exit(1) # Signal that meta-alerts were found
    else:
        print("No meta-alerts detected.")
        sys.exit(0)

if __name__ == "__main__":
    main()
