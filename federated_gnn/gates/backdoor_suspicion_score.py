import json
import sys


def calculate_suspicion(envelope_path: str) -> float:
    try:
        with open(envelope_path) as f:
            envelope = json.load(f)

        stats = envelope.get("gradient_stats", {})
        l2_norm = stats.get("l2_norm", 0.0)
        min_val = stats.get("min_val", 0.0)

        # Heuristic: High norm combined with significant negative values might indicate
        # an attempt to shift decision boundaries aggressively (mock logic).
        score = 0.0
        if l2_norm > 20.0:
            score += 0.5
        if min_val < -5.0:
            score += 0.6

        return score
    except Exception as e:
        print(f"Error calculating suspicion: {e}")
        return 0.0

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: backdoor_suspicion_score.py <envelope_json>")
        sys.exit(1)

    score = calculate_suspicion(sys.argv[1])
    print(f"Suspicion Score: {score}")

    if score > 0.8:
        print("BACKDOOR SUSPECTED")
        sys.exit(1) # Fail for gate
    else:
        print("CLEAN")
        sys.exit(0)
