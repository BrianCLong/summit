import json
import logging
import sys

from rapidfuzz import fuzz
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

# Configure logging
logging.basicConfig(level=logging.ERROR)
logger = logging.getLogger(__name__)


def normalize_string(s):
    if not s:
        return ""
    return str(s).strip().lower()


def calculate_string_similarity(val_a, val_b):
    """
    Calculates string similarity using token sort ratio and basic ratio.
    """
    if not val_a or not val_b:
        return 0.0

    # Token Sort Ratio handles reordered words better ("Doe, John" vs "John Doe")
    token_score = fuzz.token_sort_ratio(val_a, val_b) / 100.0
    # Ratio handles small typos better
    ratio_score = fuzz.ratio(val_a, val_b) / 100.0

    return max(token_score, ratio_score)


def calculate_tfidf_similarity(text_a, text_b):
    """
    Calculates TF-IDF Cosine Similarity for longer text fields.
    """
    if not text_a or not text_b:
        return 0.0

    try:
        documents = [text_a, text_b]
        tfidf = TfidfVectorizer().fit_transform(documents)
        pairwise_similarity = cosine_similarity(tfidf[0:1], tfidf)
        return float(pairwise_similarity[0][1])
    except Exception:
        # Fallback to simple string similarity if TF-IDF fails (e.g. stop words only)
        return calculate_string_similarity(text_a, text_b)


def calculate_similarity(entity_a, entity_b):
    scores = {}

    # Name Similarity (Weighted High)
    name_a = normalize_string(entity_a.get("name", ""))
    name_b = normalize_string(entity_b.get("name", ""))
    scores["name"] = calculate_string_similarity(name_a, name_b)

    # Email Similarity (Exact match critical)
    email_a = normalize_string(entity_a.get("email", ""))
    email_b = normalize_string(entity_b.get("email", ""))
    scores["email"] = calculate_string_similarity(email_a, email_b)

    # Description/Content Similarity (Use TF-IDF for richer text)
    desc_a = normalize_string(entity_a.get("description", ""))
    desc_b = normalize_string(entity_b.get("description", ""))
    if len(desc_a) > 20 and len(desc_b) > 20:
        scores["description"] = calculate_tfidf_similarity(desc_a, desc_b)
    else:
        scores["description"] = calculate_string_similarity(desc_a, desc_b)

    # Weighted Score Calculation
    weights = {"name": 0.4, "email": 0.5, "description": 0.1}

    total_score = 0.0
    total_weight = 0.0

    for key, weight in weights.items():
        if key in scores:
            total_score += scores[key] * weight
            total_weight += weight

    # Heuristic Boosts
    # If email matches exactly (score > 0.98), boost significantly
    if scores.get("email", 0) > 0.98:
        # If names also match decently, it's almost certainly a match
        if scores.get("name", 0) > 0.6:
            total_score = max(total_score, 0.98)
        else:
            total_score = max(
                total_score, 0.90
            )  # Email match but name mismatch? Suspicious but likely same account

    final_score = total_score / total_weight if total_weight > 0 else 0.0

    return min(final_score, 1.0), scores


def main():
    if len(sys.argv) < 3:
        logger.error("Usage: python api.py <entity_json_a> <entity_json_b>")
        sys.exit(1)

    try:
        entity_a = json.loads(sys.argv[1])
        entity_b = json.loads(sys.argv[2])
    except json.JSONDecodeError as e:
        logger.error(f"Invalid JSON input: {e}")
        # Return a safe fallback JSON to avoid crashing the caller
        print(
            json.dumps(
                {
                    "error": "Invalid JSON input",
                    "match": False,
                    "score": 0.0,
                    "explanation": {},
                    "version": "1.0.0",
                }
            )
        )
        sys.exit(0)

    score, explanation = calculate_similarity(entity_a, entity_b)

    # Thresholds
    match = score > 0.85

    confidence = "none"
    if score > 0.92:
        confidence = "high"
    elif score > 0.75:
        confidence = "medium"
    elif score > 0.50:
        confidence = "low"

    result = {
        "match": match,
        "score": round(score, 4),
        "explanation": explanation,
        "confidence": confidence,
        "version": "1.1.0",
    }

    print(json.dumps(result))


if __name__ == "__main__":
    main()
