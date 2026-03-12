import json
import os
from dataclasses import dataclass
from typing import List, Dict, Any

@dataclass
class EvalResult:
    query_id: str
    requires_multi_hop_correct: bool
    reasoning_chain_correct: bool
    intermediate_entities_accuracy: float
    final_answer_correct: bool
    hop_depth: int

class MockGraphRAG:
    """Mock implementation of GraphRAG to simulate responses without API calls."""
    def __init__(self, ground_truth: List[Dict[str, Any]]):
        self.knowledge = {item['id']: item for item in ground_truth}

    def query(self, query_id: str) -> Dict[str, Any]:
        """
        Simulate a GraphRAG query result.
        """
        if query_id not in self.knowledge:
            return {}

        expected = self.knowledge[query_id]

        q_num = int(query_id.split('_')[1])

        requires_multi_hop = True
        if q_num % 10 == 0:
            requires_multi_hop = False

        reasoning_chain = list(expected["expected_reasoning_chain"])
        if q_num % 5 == 0 and len(reasoning_chain) > 1:
            reasoning_chain[-1] = "Wrong_Relation"

        intermediate_entities = list(expected["expected_intermediate_entities"])
        if q_num % 6 == 0 and len(intermediate_entities) > 0:
            intermediate_entities[-1] = "Wrong_Entity"

        final_answer = expected["expected_final_answer"]
        if q_num % 4 == 0:
            final_answer = "Wrong_Answer"

        return {
            "requires_multi_hop": requires_multi_hop,
            "reasoning_chain": reasoning_chain,
            "intermediate_entities": intermediate_entities,
            "final_answer": final_answer
        }

def calculate_accuracy(expected: List[str], actual: List[str]) -> float:
    if not expected:
        return 1.0 if not actual else 0.0

    expected_set = set(expected)
    actual_set = set(actual)

    intersection = len(expected_set.intersection(actual_set))
    return intersection / len(expected_set)

def run_evaluation(fixtures_path: str) -> Dict[str, Any]:
    with open(fixtures_path, 'r') as f:
        fixtures = json.load(f)

    rag = MockGraphRAG(fixtures)
    results: List[EvalResult] = []

    for item in fixtures:
        query_id = item["id"]
        response = rag.query(query_id)

        requires_multi_hop_correct = response.get("requires_multi_hop") == item["requires_multi_hop"]
        reasoning_chain_correct = response.get("reasoning_chain") == item["expected_reasoning_chain"]

        entities_accuracy = calculate_accuracy(
            item["expected_intermediate_entities"],
            response.get("intermediate_entities", [])
        )

        final_answer_correct = response.get("final_answer") == item["expected_final_answer"]

        results.append(EvalResult(
            query_id=query_id,
            requires_multi_hop_correct=requires_multi_hop_correct,
            reasoning_chain_correct=reasoning_chain_correct,
            intermediate_entities_accuracy=entities_accuracy,
            final_answer_correct=final_answer_correct,
            hop_depth=item["hop_depth"]
        ))

    return generate_report(results)

def generate_report(results: List[EvalResult]) -> Dict[str, Any]:
    total_queries = len(results)

    if total_queries == 0:
        return {}

    requires_multi_hop_acc = sum(1 for r in results if r.requires_multi_hop_correct) / total_queries
    reasoning_chain_acc = sum(1 for r in results if r.reasoning_chain_correct) / total_queries
    avg_intermediate_entities_acc = sum(r.intermediate_entities_accuracy for r in results) / total_queries
    final_answer_acc = sum(1 for r in results if r.final_answer_correct) / total_queries

    correct_answers = [r for r in results if r.final_answer_correct]
    incorrect_answers = [r for r in results if not r.final_answer_correct]

    avg_hop_depth_correct = sum(r.hop_depth for r in correct_answers) / len(correct_answers) if correct_answers else 0.0
    avg_hop_depth_incorrect = sum(r.hop_depth for r in incorrect_answers) / len(incorrect_answers) if incorrect_answers else 0.0

    accuracy_by_depth: Dict[int, Dict[str, float]] = {}
    depths = set(r.hop_depth for r in results)

    for depth in sorted(depths):
        depth_results = [r for r in results if r.hop_depth == depth]
        depth_total = len(depth_results)
        if depth_total > 0:
            depth_correct = sum(1 for r in depth_results if r.final_answer_correct)
            accuracy_by_depth[depth] = {
                "total": depth_total,
                "accuracy": depth_correct / depth_total
            }

    report = {
        "summary": {
            "total_queries": total_queries,
            "requires_multi_hop_accuracy": requires_multi_hop_acc,
            "reasoning_chain_accuracy": reasoning_chain_acc,
            "intermediate_entities_accuracy": avg_intermediate_entities_acc,
            "final_answer_accuracy": final_answer_acc,
        },
        "hop_depth_analysis": {
            "average_hop_depth_correct_answers": avg_hop_depth_correct,
            "average_hop_depth_incorrect_answers": avg_hop_depth_incorrect,
            "accuracy_by_depth": accuracy_by_depth
        },
        "details": [
            {
                "query_id": r.query_id,
                "hop_depth": r.hop_depth,
                "requires_multi_hop_correct": r.requires_multi_hop_correct,
                "reasoning_chain_correct": r.reasoning_chain_correct,
                "intermediate_entities_accuracy": r.intermediate_entities_accuracy,
                "final_answer_correct": r.final_answer_correct
            }
            for r in results
        ]
    }

    return report

if __name__ == "__main__":
    fixtures_path = os.path.join(os.path.dirname(__file__), '..', 'fixtures', 'multi-hop', 'queries.json')
    report = run_evaluation(fixtures_path)

    report_path = os.path.join(os.path.dirname(__file__), 'report.json')
    with open(report_path, 'w') as f:
        json.dump(report, f, indent=2)

    print(f"Evaluation complete. Report saved to {report_path}")
    print(json.dumps(report["summary"], indent=2))
