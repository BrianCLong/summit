#!/usr/bin/env python3
import datetime
import json
import logging
import sys
from collections import Counter
from pathlib import Path

# Add root to python path to import evidence module
root_dir = Path(__file__).resolve().parents[2]
sys.path.append(str(root_dir))

from evidence.causality_ledger import CausalityLedger


def check_drift():
    # Ensure ledger looks for logs in the correct place relative to root
    # assuming default logs are in evidence/logs
    log_dir = root_dir / "evidence/logs"
    ledger = CausalityLedger(log_dir=str(log_dir))

    entries = ledger.read_ledger()

    if not entries:
        print("No outsourcing events found.")
        return

    # Filter events for last 7 days
    now = datetime.datetime.utcnow()
    one_week_ago = now - datetime.timedelta(days=7)

    recent_events = [
        e for e in entries
        if datetime.datetime.fromisoformat(e["timestamp"]) > one_week_ago
    ]

    count = len(recent_events)
    print(f"Outsourcing attempts in last 7 days: {count}")

    # Calculate drift (simple threshold for now)
    THRESHOLD = 10
    if count > THRESHOLD:
        print(f"ALERT: High number of outsourcing attempts detected ({count} > {THRESHOLD}).")
        sys.exit(1)

    # Analyze domains
    domains = [e.get("domain", "unknown") for e in recent_events]
    domain_counts = Counter(domains)
    print("Top domains:", domain_counts.most_common(3))

if __name__ == "__main__":
    check_drift()
