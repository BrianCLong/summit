import json
import os
import re

def score_logical_flow(text):
    """Evaluate logical flow based on the presence of transitional words (mock heuristic)."""
    transitions = ['however', 'therefore', 'furthermore', 'according to', 'initially', 'by wednesday', 'before', 'subsequently']
    text_lower = text.lower()
    score = 0.5
    for t in transitions:
        if t in text_lower:
            score += 0.2
    return min(1.0, round(score, 2))

def score_entity_consistency(text):
    """Evaluate entity consistency based on pronoun usage (mock heuristic)."""
    text_lower = text.lower()
    if "alice" in text_lower and "him" in text_lower and "she" in text_lower:
        return 0.2
    return 1.0

def score_temporal_ordering(text):
    """Evaluate temporal ordering (mock heuristic)."""
    text_lower = text.lower()
    if "before the launch" in text_lower and "july 20" in text_lower:
        return 0.3
    return 0.9

def score_absence_of_contradictions(text):
    """Evaluate absence of contradictions (mock heuristic)."""
    text_lower = text.lower()
    if "returned" in text_lower and "never made it back" in text_lower:
        return 0.0
    return 1.0

def score_readability(text):
    """Evaluate readability based on average sentence length (mock heuristic)."""
    sentences = re.split(r'[.!?]+', text)
    sentences = [s.strip() for s in sentences if s.strip()]
    if not sentences:
        return 0.0
    avg_len = sum(len(s.split()) for s in sentences) / len(sentences)
    if 5 <= avg_len <= 20:
        return 1.0
    elif avg_len > 20:
        return 0.7
    else:
        return 0.5

def evaluate_response(item):
    text = item.get("response", "")
    scores = {
        "logical_flow": score_logical_flow(text),
        "entity_consistency": score_entity_consistency(text),
        "temporal_ordering": score_temporal_ordering(text),
        "absence_of_contradictions": score_absence_of_contradictions(text),
        "readability": score_readability(text)
    }
    scores["overall_coherence"] = round(sum(scores.values()) / len(scores), 2)
    return scores

def main():
    fixture_path = os.path.join("evals", "fixtures", "narrative", "responses.json")
    report_path = os.path.join("evals", "narrative", "report.json")

    with open(fixture_path, "r") as f:
        data = json.load(f)

    results = []
    aggregate = {
        "logical_flow": 0,
        "entity_consistency": 0,
        "temporal_ordering": 0,
        "absence_of_contradictions": 0,
        "readability": 0,
        "overall_coherence": 0
    }

    for item in data:
        scores = evaluate_response(item)
        for k in aggregate:
            aggregate[k] += scores[k]

        results.append({
            "id": item["id"],
            "query": item["query"],
            "expected_coherence": item.get("expected_coherence", "unknown"),
            "scores": scores
        })

    num_items = len(data)
    if num_items > 0:
        for k in aggregate:
            aggregate[k] = round(aggregate[k] / num_items, 2)

    report = {
        "benchmark_aggregate": aggregate,
        "results": results
    }

    with open(report_path, "w") as f:
        json.dump(report, f, indent=2)

    print(f"Evaluation complete. Report saved to {report_path}")

if __name__ == "__main__":
    main()
