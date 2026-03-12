import json
import os
import glob

def consolidate():
    test_bank = {
        "tasks": [],
        "ground_truth": {}
    }

    # Load cases
    cases_path = "evaluation/benchmarks/graphrag/cases.json"
    if os.path.exists(cases_path):
        with open(cases_path, 'r') as f:
            cases_data = json.load(f)
            test_bank["tasks"] = cases_data.get("tasks", [])

    # Load ground truth evidence
    evidence_files = glob.glob("GOLDEN/datasets/graphrag/EVID_*.json")
    for file_path in evidence_files:
        with open(file_path, 'r') as f:
            evidence = json.load(f)
            eid = evidence.get("id")
            if eid:
                test_bank["ground_truth"][eid] = evidence

    # Also include some basic ones
    basic_files = glob.glob("GOLDEN/datasets/graphrag/graphrag_*.json")
    for file_path in basic_files:
        with open(file_path, 'r') as f:
            evidence = json.load(f)
            eid = evidence.get("id")
            if eid:
                test_bank["ground_truth"][eid] = evidence

    with open("evals/hallucination/test_bank.json", "w") as f:
        json.dump(test_bank, f, indent=2)
    print("Consolidated test_bank.json created.")

if __name__ == "__main__":
    consolidate()
