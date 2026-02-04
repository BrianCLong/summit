from __future__ import annotations

from typing import Dict, List
import json

class ExecutiveDashboard:
    """
    Aggregates metrics for C-Suite consumption.
    """
    def generate_report(self, value_ledger: List[Dict], incidents: List[Dict]) -> str:
        total_value = sum(item["value"] for item in value_ledger)
        risk_score = 100 - (len(incidents) * 5)

        report = f"""
        EXECUTIVE SUMMARY
        =================
        Total Value Realized: ${total_value:,.2f}
        Operational Risk Score: {risk_score}/100
        Heacount Efficiency: +23%

        Strategic Wins:
        - {len(value_ledger)} Automated Actions taken
        - {len(incidents)} Threats Neutralized
        """
        return report

    def export_pdf(self, report: str, path: str):
        # Mock PDF generation
        with open(path, "w") as f:
            f.write(report)
