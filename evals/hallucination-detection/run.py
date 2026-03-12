import json
import os
import sys
from pathlib import Path
from typing import List, Dict, Any

# Add current directory to path so detector can be imported
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from detector import HallucinationDetector

# Use absolute paths or paths relative to repo root if running from root
ROOT_DIR = Path(__file__).resolve().parents[2]
FIXTURES_DIR = ROOT_DIR / "evals/fixtures/hallucination-detection"
CASES_FILE = FIXTURES_DIR / "cases.jsonl"
REPORT_FILE = ROOT_DIR / "evals/hallucination-detection/report.json"

def main():
    detector = HallucinationDetector()
    results = []

    if not CASES_FILE.exists():
        print(f"Error: Fixtures file {CASES_FILE} not found.")
        return

    with open(CASES_FILE, "r") as f:
        for line in f:
            if not line.strip():
                continue
            case = json.loads(line)
            question = case.get("question")
            context = case.get("context")
            answer = case.get("answer")
            label = case.get("label")
            hallucination_types = case.get("hallucination_types", [])

            evaluation = detector.evaluate(answer, context)

            # Record result
            results.append({
                "question": question,
                "answer": answer,
                "label": label,
                "hallucination_types": hallucination_types,
                "is_hallucinated": evaluation["is_hallucinated"],
                "faithfulness_score": evaluation["faithfulness_score"],
                "issues": evaluation["issues"]
            })

    # Calculate overall metrics
    total_cases = len(results)
    hallucinations_detected = sum(1 for r in results if r["is_hallucinated"])
    hallucination_rate = hallucinations_detected / total_cases if total_cases > 0 else 0
    average_faithfulness = sum(r["faithfulness_score"] for r in results) / total_cases if total_cases > 0 else 0

    # Write report
    report = {
        "summary": {
            "total_cases": total_cases,
            "hallucination_rate": hallucination_rate,
            "average_faithfulness": average_faithfulness
        },
        "details": results
    }

    with open(REPORT_FILE, "w") as f:
        json.dump(report, f, indent=4)

    print(f"Evaluation complete. Hallucination rate: {hallucination_rate:.2f}, Average faithfulness: {average_faithfulness:.2f}")
    print(f"Detailed report written to {REPORT_FILE}")

if __name__ == "__main__":
    main()
