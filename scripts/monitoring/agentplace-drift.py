import json
import os
import sys

HISTORY_FILE = "risk_history.json"

def main():
    # Load history or create mock baseline
    if os.path.exists(HISTORY_FILE):
        try:
            with open(HISTORY_FILE, 'r') as f:
                history = json.load(f)
        except:
             history = [20] * 10
    else:
        # Mock baseline: last 10 runs had avg score 20
        history = [20] * 10

    # Simulate current run score (mocked for demo)
    current_score = 22

    # Calculate baseline
    # Use last 10 entries
    recent_history = history[-10:]
    if not recent_history:
        baseline = 20
    else:
        baseline = sum(recent_history) / len(recent_history)

    deviation = abs(current_score - baseline) / baseline if baseline > 0 else 0

    drift_detected = deviation > 0.15

    report = {
        "baseline_score": baseline,
        "current_score": current_score,
        "deviation_percent": deviation * 100,
        "drift_detected": drift_detected
    }

    print(json.dumps(report, indent=2))

    with open("drift_report.json", "w") as f:
        json.dump(report, f, indent=2)

    if drift_detected:
        print(f"DRIFT ALERT: Risk score deviation {deviation*100:.1f}% > 15%")
        # Non-blocking alert
        sys.exit(0)

if __name__ == "__main__":
    main()
