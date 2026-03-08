import json
import os


def check_drift():
    if not os.path.exists("metrics.json"):
        print("No metrics.json found. Skipping drift check.")
        return

    with open("metrics.json") as f:
        metrics = json.load(f)

    score = metrics.get("ValidationBiasRisk", 0.0)

    if score > 0.6:
        print(f"ALERT: ValidationBiasRisk is high ({score} > 0.6)")
    else:
        print(f"ValidationBiasRisk is nominal ({score} <= 0.6)")

if __name__ == "__main__":
    check_drift()
