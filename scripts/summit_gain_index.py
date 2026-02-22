#!/usr/bin/env python3
"""
Summit Gain Index Calculator

This script parses GitHub Issues (specifically 'Customer Story') and system metrics
to compute the 'Gain Index' - a measure of time saved and risk reduced.

Usage:
    python3 scripts/summit_gain_index.py
"""

import json
import random
from datetime import datetime

def calculate_gain_index():
    # Placeholder for fetching data from GitHub API and Prometheus
    # In a real scenario, this would use `PyGithub` and `requests`.

    print("🏔  Calculating Summit Gain Index...")

    # Simulated Data
    stories = [
        {"customer": "FinTech Corp", "time_saved_hours": 40, "risk_reduced": "High"},
        {"customer": "Logistics Inc", "time_saved_hours": 120, "risk_reduced": "Medium"},
        {"customer": "Gov Agency", "time_saved_hours": 200, "risk_reduced": "Critical"},
    ]

    total_hours_saved = sum(s["time_saved_hours"] for s in stories)
    risk_score = len([s for s in stories if s["risk_reduced"] in ["High", "Critical"]]) * 10

    gain_index = (total_hours_saved * 0.5) + (risk_score * 2)

    report = {
        "timestamp": datetime.now().isoformat(),
        "gain_index": gain_index,
        "metrics": {
            "total_hours_saved": total_hours_saved,
            "critical_risks_mitigated": risk_score / 10
        },
        "stories_processed": len(stories)
    }

    print(json.dumps(report, indent=2))

if __name__ == "__main__":
    calculate_gain_index()
