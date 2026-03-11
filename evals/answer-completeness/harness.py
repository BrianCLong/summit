import datetime
import json
import re
import sys
import hashlib
from pathlib import Path

# Constants
ROOT = Path(__file__).resolve().parents[2]
EVIDENCE_DIR = ROOT / "evidence"
FIXTURES_PATH = ROOT / "evals/fixtures/answer-completeness/fixtures.jsonl"
# Using required EVD format EVD-[A-Z0-9]+-[A-Z0-9]+-[0-9]{3}
EVD_ID = "EVD-COMPLETENESS-EVAL-001"
ITEM_SLUG = "answer-completeness-harness"

def load_jsonl(p):
    with open(p) as f:
        return [json.loads(line) for line in f if line.strip()]

def calculate_sha256(content: str) -> str:
    return hashlib.sha256(content.encode("utf-8")).hexdigest()

def evaluate_completeness(fixture):
    query = fixture.get("query", "")
    answer = fixture.get("generated_answer", "")
    expected_entities = fixture.get("expected_entities", [])
    sub_questions = fixture.get("sub_questions", [])
    critical_context = fixture.get("critical_context", "")
    relationships = fixture.get("relationships", [])

    # 1. Entity Coverage
    if not expected_entities:
        entity_score = 1.0
    else:
        found_entities = [e for e in expected_entities if e.lower() in answer.lower()]
        entity_score = len(found_entities) / len(expected_entities)

    # 2. Sub-question Coverage (Simplified heuristic)
    if not sub_questions:
        sq_score = 1.0
    else:
        sq_found = 0
        for sq in sub_questions:
            keywords = [w for w in re.findall(r"\w+", sq.lower()) if len(w) > 3]
            if any(kw in answer.lower() for kw in keywords):
                sq_found += 1
        sq_score = sq_found / len(sub_questions)

    # 3. Critical Context Omission
    cc_words = [w for w in re.findall(r"\w+", critical_context.lower()) if len(w) > 3]
    if not cc_words:
        cc_score = 1.0
    else:
        cc_found = sum(1 for kw in cc_words if kw in answer.lower())
        cc_score = cc_found / len(cc_words)
    omission_rate = 1.0 - cc_score

    # 4. Length Calibration (Heuristic)
    complexity = len(sub_questions) + len(expected_entities) / 5.0
    target_length = max(50, complexity * 50) # at least 50 chars
    actual_length = len(answer)
    if actual_length == 0:
        length_score = 0.0
    else:
        ratio = actual_length / target_length
        if 0.5 <= ratio <= 2.0:
            length_score = 1.0
        else:
            length_score = max(0.0, 1.0 - abs(1.0 - ratio))

    # 5. Relationship Surfacing
    if not relationships:
        rel_score = 1.0
    else:
        rel_found = 0
        for rel in relationships:
            words = [w for w in re.findall(r"\w+", rel.lower()) if len(w) > 3]
            if not words or sum(1 for kw in words if kw in answer.lower()) >= len(words) // 2 + 1:
                rel_found += 1
        rel_score = rel_found / len(relationships)

    # Total Score
    total_score = (entity_score + sq_score + cc_score + length_score + rel_score) / 5.0

    return {
        "id": fixture.get("id", "unknown"),
        "completeness_score": total_score,
        "omission_rate": omission_rate,
        "details": {
            "entity_coverage": entity_score,
            "sub_question_coverage": sq_score,
            "critical_context_score": cc_score,
            "length_calibration": length_score,
            "relationship_surfacing": rel_score
        }
    }

def main():
    if not FIXTURES_PATH.exists():
        print(f"Error: Fixtures not found at {FIXTURES_PATH}")
        sys.exit(1)

    fixtures = load_jsonl(FIXTURES_PATH)
    if not fixtures:
        print("No fixtures found.")
        return

    results = []
    for f in fixtures:
        results.append(evaluate_completeness(f))

    avg_score = sum(r["completeness_score"] for r in results) / len(results)
    avg_omission = sum(r["omission_rate"] for r in results) / len(results)

    evidence_id = EVD_ID

    out_dir = EVIDENCE_DIR / evidence_id
    out_dir.mkdir(parents=True, exist_ok=True)

    # Prepare Evidence Files
    report = {
        "evidence_id": evidence_id,
        "item_slug": ITEM_SLUG,
        "summary": f"Evaluated answer completeness across {len(results)} samples. Average completeness: {avg_score:.2f}, Omission rate: {avg_omission:.2f}",
        "artifacts": [
            {
                "path": str(FIXTURES_PATH.relative_to(ROOT)),
                "sha256": calculate_sha256(FIXTURES_PATH.read_text())
            }
        ]
    }

    metrics = {
        "evidence_id": evidence_id,
        "metrics": {
            "average_completeness": avg_score,
            "average_omission_rate": avg_omission,
            "sample_size": len(results)
        }
    }

    stamp = {
        "evidence_id": evidence_id,
        "created_utc": datetime.datetime.now(datetime.timezone.utc).isoformat().replace("+00:00", "Z"),
        "git_commit": "HEAD"
    }

    # Write files
    (out_dir / "report.json").write_text(json.dumps(report, indent=2))
    (out_dir / "metrics.json").write_text(json.dumps(metrics, indent=2))
    (out_dir / "stamp.json").write_text(json.dumps(stamp, indent=2))

    # Update index.json (preserving schema)
    index_path = EVIDENCE_DIR / "index.json"
    index = json.loads(index_path.read_text())

    # Remove existing entry if any
    index["items"] = [x for x in index.get("items", []) if x["id"] != evidence_id]

    entry = {
        "id": evidence_id,
        "path": f"{evidence_id}/report.json"
    }
    index["items"].append(entry)

    index_path.write_text(json.dumps(index, indent=2) + "\n")

    print(f"Harness execution complete. Evidence ID: {evidence_id}")
    print(f"Average Completeness Score: {avg_score:.2f}")

if __name__ == "__main__":
    main()
