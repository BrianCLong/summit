import math
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from services.tpfr import TabularPerceptualFingerprintRegistry


def create_sample_tables():
    base = [
        {"id": 1, "name": "Alice", "score": 98.2},
        {"id": 2, "name": "Bob", "score": 87.5},
        {"id": 3, "name": "Charlie", "score": 91.1},
        {"id": 4, "name": "Dana", "score": 93.0},
    ]
    shuffled = list(reversed(base))
    jittered = [
        {"id": row["id"], "name": row["name"].upper(), "score": row["score"] + 0.02}
        for row in base
    ]
    unrelated = [
        {"user_id": 11, "city": "Paris", "visits": 10},
        {"user_id": 12, "city": "London", "visits": 5},
        {"user_id": 13, "city": "Lisbon", "visits": 2},
    ]
    return base, shuffled, jittered, unrelated


def test_registry_detects_near_duplicates():
    base, shuffled, jittered, unrelated = create_sample_tables()
    registry = TabularPerceptualFingerprintRegistry(similarity_threshold=0.7)
    registry.add("base", base)

    shuffled_matches = registry.find_similar(shuffled)
    assert shuffled_matches, "Expected shuffled table to be recognised as similar"
    identifier, similarity = shuffled_matches[0][0].identifier, shuffled_matches[0][1]
    assert identifier == "base"
    assert similarity > 0.9

    jitter_matches = registry.find_similar(jittered)
    assert jitter_matches, "Expected jittered table to remain similar"
    jitter_similarity = jitter_matches[0][1]
    assert jitter_similarity > 0.8

    unrelated_matches = registry.find_similar(unrelated)
    assert not unrelated_matches, "Unrelated table should not cross threshold"


def test_diff_explainer_highlights_schema_changes():
    base, _, jittered, unrelated = create_sample_tables()
    registry = TabularPerceptualFingerprintRegistry(similarity_threshold=0.7)
    registry.add("base", base)

    diff = registry.explain_difference(base, jittered)
    assert math.isclose(diff["overall_similarity"], diff["schema_similarity"], rel_tol=0.2)
    assert diff["schema_changes"]["added"] == []
    assert diff["schema_changes"]["removed"] == []
    assert diff["column_differences"], "Jittered table should report per-column differences"

    unrelated_diff = registry.explain_difference(base, unrelated)
    assert unrelated_diff["schema_changes"]["removed"] == ["id", "name", "score"]
    assert unrelated_diff["schema_changes"]["added"] == ["city", "user_id", "visits"]
    assert unrelated_diff["overall_similarity"] < 0.4

