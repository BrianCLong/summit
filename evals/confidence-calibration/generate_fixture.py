import json
import random

random.seed(42)

def generate_predictions(num_samples=200):
    data = []
    for i in range(num_samples):
        # Sample a true confidence (accuracy probability)
        # Let's create an uncalibrated model for interesting ECE
        # e.g., model is overconfident.
        # true prob of being correct
        true_prob = random.uniform(0.1, 0.9)

        # model predicts confidence, but it's systematically higher
        predicted_conf = min(1.0, true_prob + random.uniform(0.0, 0.3))

        is_correct = random.random() < true_prob

        data.append({
            "id": f"q_{i}",
            "query": f"Mock query {i}?",
            "ground_truth": "True Answer" if is_correct else "True Answer",
            "predicted_answer": "True Answer" if is_correct else "Wrong Answer",
            "confidence_score": predicted_conf,
            "is_correct": is_correct
        })
    return data

if __name__ == "__main__":
    data = generate_predictions(500)
    with open("evals/fixtures/confidence-calibration/test_set.json", "w") as f:
        json.dump(data, f, indent=2)
