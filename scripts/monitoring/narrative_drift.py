import argparse
import json
import sys

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--current", required=True, help="Current metrics.json")
    parser.add_argument("--baseline", required=True, help="Baseline metrics.json")
    args = parser.parse_args()

    with open(args.current) as f:
        current = json.load(f)
    with open(args.baseline) as f:
        baseline = json.load(f)

    c_metrics = current.get("metrics", {})
    b_metrics = baseline.get("metrics", {})

    # Simple drift check: if event count differs by > 50%
    c_count = c_metrics.get("event_count", 0)
    b_count = b_metrics.get("event_count", 0)

    if abs(c_count - b_count) > b_count * 0.5 and b_count > 0:
        print(f"DRIFT DETECTED: Event count {c_count} differs significantly from baseline {b_count}")
        sys.exit(1)

    print("No significant drift detected.")

if __name__ == "__main__":
    main()
