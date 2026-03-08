import datetime
import json
import os
import sys

# Assume we run from project root, add path to sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from summit.agents.ai_supply_chain_monitor.propagation_analyzer import Package, PropagationAnalyzer


def run_drift_analysis():
    print(f"[{datetime.datetime.now(datetime.UTC).isoformat()}] Starting AI Supply Chain Drift Analysis")

    # In a real system, this would query the graph database
    # For now, we mock some packages that might be drifting
    monitored_packages = [
        {"name": "requests", "age": 4000, "trust": 0.99, "ai_recs": 5000000},
        {"name": "fast-json-parser", "age": 2, "trust": 0.1, "ai_recs": 25000},
        {"name": "llm-prompt-helper", "age": 14, "trust": 0.4, "ai_recs": 12000}
    ]

    analyzer = PropagationAnalyzer()
    anomalies = []

    for pkg_data in monitored_packages:
        package = Package(
            name=pkg_data["name"],
            age_days=pkg_data["age"],
            trust_score=pkg_data["trust"],
            ai_recommendations=pkg_data["ai_recs"]
        )

        if analyzer.detect_autonomous_propagation(package):
            anomalies.append(pkg_data)
            print(f"  [!] Anomaly detected: {pkg_data['name']} (Age: {pkg_data['age']}d, Recs: {pkg_data['ai_recs']})")

    print(f"Analysis complete. Found {len(anomalies)} anomalies.")

    # Dump metrics for alerting
    os.makedirs("evidence/monitoring", exist_ok=True)
    with open("evidence/monitoring/drift_metrics.json", "w") as f:
        json.dump({
            "timestamp": datetime.datetime.now(datetime.UTC).isoformat(),
            "packages_scanned": len(monitored_packages),
            "anomalies_detected": len(anomalies),
            "anomalies": anomalies
        }, f, indent=2)

if __name__ == "__main__":
    run_drift_analysis()
