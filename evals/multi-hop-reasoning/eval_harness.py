import json
import os

class MockGraphRAG:
    """Mock GraphRAG component that simulates multi-hop reasoning without live API calls."""
    def __init__(self):
        # Predefined responses that simulate reasoning chains for multi-hop queries
        self.responses = {
            "Who is the CEO of the company that acquired WhatsApp?": {
                "answer": "The CEO of Facebook, which acquired WhatsApp, is Mark Zuckerberg.",
                "hops": [
                    "Company that acquired WhatsApp is Facebook",
                    "CEO of Facebook is Mark Zuckerberg"
                ],
                "intermediate_conclusions": [
                    "Facebook acquired WhatsApp"
                ],
                "is_multi_hop": True,
                "reasoning_depth": 2
            },
            "What is the capital of France?": {
                "answer": "The capital of France is Paris.",
                "hops": [
                    "Capital of France is Paris"
                ],
                "intermediate_conclusions": [],
                "is_multi_hop": False,
                "reasoning_depth": 1
            },
            "In what country was the inventor of the telephone born?": {
                "answer": "Alexander Graham Bell was born in Scotland (UK).",
                "hops": [
                    "Inventor of the telephone is Alexander Graham Bell",
                    "Alexander Graham Bell was born in Scotland (UK)"
                ],
                "intermediate_conclusions": [
                    "Alexander Graham Bell invented the telephone"
                ],
                "is_multi_hop": True,
                "reasoning_depth": 2
            },
            "Which planet is known as the Red Planet?": {
                "answer": "Mars is known as the Red Planet.",
                "hops": [
                    "The Red Planet is Mars",
                    "Jupiter is known as the gas giant" # Intentional irrelevant hop for evaluation
                ],
                "intermediate_conclusions": [],
                "is_multi_hop": False, # But actually gave two hops
                "reasoning_depth": 2
            },
            "What is the boiling point of the liquid that makes up about 60% of the human adult body?": {
                "answer": "The boiling point is 100 degrees Celsius.",
                "hops": [
                    "Liquid that makes up 60% of the human adult body is water",
                    "Boiling point of water is 100 degrees Celsius (212 degrees Fahrenheit)"
                ],
                "intermediate_conclusions": [
                    "Water makes up about 60% of the human body"
                ],
                "is_multi_hop": True,
                "reasoning_depth": 2
            }
        }

    def query(self, question: str):
        return self.responses.get(question, {
            "answer": "Unknown",
            "hops": [],
            "intermediate_conclusions": [],
            "is_multi_hop": False,
            "reasoning_depth": 0
        })

def evaluate_multi_hop_reasoning():
    fixtures_path = os.path.join(
        os.path.dirname(__file__),
        "../fixtures/multi-hop-reasoning/queries.json"
    )

    with open(fixtures_path, "r") as f:
        fixtures = json.load(f)

    rag = MockGraphRAG()

    results = []
    total_hop_accuracy = 0.0
    total_chain_validity = 0.0
    total_reasoning_depth_score = 0.0

    for item in fixtures:
        q = item["query"]
        expected_multi = item["is_multi_hop"]
        expected_depth = item["expected_depth"]
        expected_hops = set(item["expected_hops"])
        expected_conclusions = set(item["intermediate_conclusions"])
        expected_contains = item["expected_answer_contains"]

        response = rag.query(q)
        actual_hops = set(response["hops"])
        actual_conclusions = set(response["intermediate_conclusions"])

        # 1. Whether all required reasoning hops are present
        missing_hops = expected_hops - actual_hops
        all_required_hops_present = len(missing_hops) == 0
        hop_accuracy = 1.0 if all_required_hops_present else 0.0

        # 2. Whether intermediate conclusions are correctly derived
        conclusions_correct = expected_conclusions.issubset(actual_conclusions)

        # 3. Whether the final answer logically follows from the chain of evidence
        answer_correct = expected_contains.lower() in response["answer"].lower()

        # 4. Whether irrelevant hops are avoided
        irrelevant_hops = actual_hops - expected_hops
        irrelevant_hops_avoided = len(irrelevant_hops) == 0

        # 5. Whether system correctly identifies when multi-hop reasoning is needed vs single-source
        multi_hop_detected_correctly = response["is_multi_hop"] == expected_multi

        # Chain validity rate: Needs all required hops, correct intermediate conclusions,
        # logical final answer, and no irrelevant hops
        chain_validity = 1.0 if (
            all_required_hops_present and
            conclusions_correct and
            answer_correct and
            irrelevant_hops_avoided
        ) else 0.0

        # Reasoning depth metric (could be ratio or exact match, let's do exact match score)
        reasoning_depth_score = 1.0 if response["reasoning_depth"] == expected_depth else 0.0

        results.append({
            "query": q,
            "metrics": {
                "all_required_hops_present": all_required_hops_present,
                "intermediate_conclusions_correct": conclusions_correct,
                "final_answer_logical": answer_correct,
                "irrelevant_hops_avoided": irrelevant_hops_avoided,
                "multi_hop_detection_correct": multi_hop_detected_correctly,
                "hop_accuracy": hop_accuracy,
                "chain_validity": chain_validity,
                "reasoning_depth_score": reasoning_depth_score
            },
            "details": {
                "missing_hops": list(missing_hops),
                "irrelevant_hops": list(irrelevant_hops)
            }
        })

        total_hop_accuracy += hop_accuracy
        total_chain_validity += chain_validity
        total_reasoning_depth_score += reasoning_depth_score

    num_queries = len(fixtures)

    final_metrics = {
        "summary": {
            "hop_accuracy": total_hop_accuracy / num_queries if num_queries else 0,
            "chain_validity_rate": total_chain_validity / num_queries if num_queries else 0,
            "reasoning_depth_accuracy": total_reasoning_depth_score / num_queries if num_queries else 0,
        },
        "evaluations": results
    }

    output_path = os.path.join(os.path.dirname(__file__), "metrics.json")
    with open(output_path, "w") as f:
        json.dump(final_metrics, f, indent=2)

    print(f"Evaluation completed. Results written to {output_path}")

if __name__ == "__main__":
    evaluate_multi_hop_reasoning()
