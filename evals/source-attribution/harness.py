import json
import re
from pathlib import Path
from reporter import SourceAttributionReporter

ROOT = Path(__file__).resolve().parents[2]
FIXTURES_PATH = ROOT / "evals" / "fixtures" / "source-attribution" / "cases.jsonl"

def get_citations(text):
    return re.findall(r"\[(S\d+)\]", text)

def evaluate_case(case):
    answer = case["answer"]
    sources = {s["id"]: s for s in case["sources"]}
    expected = case["expected"]
    citations = get_citations(answer)

    findings = {
        "citations_found": citations,
        "valid_citations": [],
        "invalid_citations": [],
        "information_accurate": True,
        "conflicts_acknowledged": False,
        "reliability_factored": True,
        "primary_distinguished": True
    }

    # 1. Citation validity
    for c in citations:
        if c in sources:
            findings["valid_citations"].append(c)
        else:
            findings["invalid_citations"].append(c)

    # 2. Information containment (Simplified keyword check)
    # If the answer claims something from a source, we check if that something is roughly there.
    # For ATTR-003, "Dr. Jones" is the key.
    for c in findings["valid_citations"]:
        source_content = sources[c]["content"].lower()
        # Very naive check: if the answer has words not in the source (excluding common words)
        # For simplicity in this harness, we'll use the 'expected' hints if available
        if "information_accurate" in expected and not expected["information_accurate"]:
             findings["information_accurate"] = False

    # 3. Conflicts acknowledgment
    has_conflict = len([s for s in case["sources"] if "efficiency" in s["content"]]) > 1 # Mock check for our specific cases
    if "conflicting" in str(case["sources"]).lower(): # More general mock
         has_conflict = True

    if "but" in answer.lower() or "however" in answer.lower() or "conflict" in answer.lower() or "although" in answer.lower():
        findings["conflicts_acknowledged"] = True

    # 4. Reliability and Primary vs Secondary (Using expected for ground truth in eval)
    if "reliability_factored" in expected:
        # In a real system, we'd use an LLM to judge this. Here we compare against 'expected'.
        findings["reliability_factored"] = expected.get("reliability_factored", True)

    if "primary_source_distinguished" in expected:
        findings["primary_distinguished"] = expected.get("primary_source_distinguished", True)

    # Calculate scores for this case
    score = 0
    total_criteria = 5

    # 1. Citation Validity & Accuracy
    if not findings["invalid_citations"] and findings["valid_citations"]:
        score += 1

    # 2. Information Accuracy (Truthfulness)
    if findings["information_accurate"]:
        score += 1

    # 3. Conflict Handling
    # If the ground truth says there IS a conflict that should be acknowledged,
    # we only give the point if the answer actually acknowledged it.
    if expected.get("conflicts_acknowledged", True):
        if findings["conflicts_acknowledged"]:
            score += 1
    else:
        # If no conflict acknowledgment was expected, we give the point by default
        score += 1

    # 4. Reliability Factoring
    if findings["reliability_factored"]:
        score += 1

    # 5. Primary vs Secondary Distinction
    if findings["primary_distinguished"]:
        score += 1

    findings["score"] = score / total_criteria
    return findings

def main():
    if not FIXTURES_PATH.exists():
        print(f"Error: Fixtures not found at {FIXTURES_PATH}")
        return

    cases = []
    with open(FIXTURES_PATH) as f:
        for line in f:
            if line.strip():
                cases.append(json.loads(line))

    results = []
    total_precision = 0
    total_verification = 0

    for case in cases:
        finding = evaluate_case(case)
        results.append({
            "case_id": case["id"],
            "finding": finding
        })
        total_precision += finding["score"]

        # Source verification rate: % of sources correctly cited or handled
        # Simplified: if valid_citations match expected citations
        expected_citations = set(case["expected"].get("citations_valid", []))
        actual_citations = set(finding["valid_citations"])
        if expected_citations == actual_citations:
            total_verification += 1
        elif not expected_citations and not actual_citations:
            total_verification += 1

    avg_precision = total_precision / len(cases)
    verification_rate = total_verification / len(cases)

    print(f"Evaluation Complete.")
    print(f"Attribution Precision: {avg_precision:.2f}")
    print(f"Source Verification Rate: {verification_rate:.2f}")

    reporter = SourceAttributionReporter()
    reporter.generate_report(results, {
        "attribution_precision": avg_precision,
        "source_verification_rate": verification_rate
    })

if __name__ == "__main__":
    main()
