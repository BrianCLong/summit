import sys
import os
import json
import argparse

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from summit.policies.repetition_detector import classify_repetition
from summit.policies.repetition_transform import reinforce_constraints
from summit.evaluators.repetition_eval import generate_evidence

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--prompt', type=str, default="This is a test. This is a test.")
    args = parser.parse_args()

    result = classify_repetition(args.prompt)

    if result['class'] == 'beneficial' and os.environ.get('SUMMIT_ENABLE_REPETITION_REINFORCEMENT') == 'true':
        transformed = reinforce_constraints(args.prompt)
        print("Transformed prompt:")
        print(transformed)

    report, metrics, stamp = generate_evidence(args.prompt, result)

    os.makedirs('artifacts/repetition', exist_ok=True)

    with open('artifacts/repetition/report.json', 'w') as f:
        json.dump(report, f, indent=2)
    with open('artifacts/repetition/metrics.json', 'w') as f:
        json.dump(metrics, f, indent=2)
    with open('artifacts/repetition/stamp.json', 'w') as f:
        json.dump(stamp, f, indent=2)

    print(f"Repetition class: {result['class']}, score: {result['score']}")

if __name__ == "__main__":
    main()
