import argparse
import json
import sys
import os
import yaml

# Add root to sys.path to allow imports
sys.path.append(os.getcwd())

from modules.agentplace.evaluator import AgentEvaluator

def main():
    parser = argparse.ArgumentParser(description='AgentPlace Policy Check')
    parser.add_argument('manifest', help='Path to agent manifest JSON file')
    parser.add_argument('--threshold', type=int, default=80, help='Max acceptable risk score')
    args = parser.parse_args()

    if not os.path.exists(args.manifest):
        print(f"Error: Manifest file {args.manifest} not found")
        sys.exit(1)

    evaluator = AgentEvaluator()

    try:
        with open(args.manifest, 'r') as f:
            manifest = json.load(f)
    except Exception as e:
        print(f"Error loading manifest: {e}")
        sys.exit(1)

    report = evaluator.evaluate(manifest)

    print(json.dumps(report.to_dict(), indent=2))

    if report.governance_action == "REJECT":
        print(f"POLICY VIOLATION: Agent rejected due to high risk score ({report.score})")
        sys.exit(1)

    if report.governance_action == "MANUAL_REVIEW":
        print(f"POLICY WARNING: Agent requires manual review (Score: {report.score})")
        # Ensure CI fails or warns? Let's fail to block auto-merge.
        sys.exit(1)

    if report.score > args.threshold:
        print(f"POLICY VIOLATION: Score {report.score} exceeds threshold {args.threshold}")
        sys.exit(1)

    print("Policy Check Passed")
    sys.exit(0)

if __name__ == "__main__":
    main()
