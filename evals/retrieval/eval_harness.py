import json
import math
import argparse
import sys
from typing import List, Dict, Any, Set, Tuple

def compute_precision(retrieved: List[str], relevant: Set[str]) -> float:
    if not retrieved:
        return 0.0
    retrieved_set = set(retrieved)
    return len(retrieved_set.intersection(relevant)) / len(retrieved_set)

def compute_recall(retrieved: List[str], relevant: Set[str]) -> float:
    if not relevant:
        return 1.0
    retrieved_set = set(retrieved)
    return len(retrieved_set.intersection(relevant)) / len(relevant)

def compute_f1(precision: float, recall: float) -> float:
    if precision + recall == 0:
        return 0.0
    return 2 * precision * recall / (precision + recall)

def compute_mrr(retrieved: List[str], relevant: Set[str]) -> float:
    for i, item in enumerate(retrieved):
        if item in relevant:
            return 1.0 / (i + 1)
    return 0.0

def compute_ndcg(retrieved: List[str], relevant: Set[str]) -> float:
    if not relevant:
        return 1.0
    if not retrieved:
        return 0.0

    dcg = 0.0
    for i, item in enumerate(retrieved):
        if item in relevant:
            dcg += 1.0 / math.log2(i + 2) # i+2 because i is 0-indexed

    idcg = 0.0
    for i in range(min(len(retrieved), len(relevant))):
        idcg += 1.0 / math.log2(i + 2)

    if idcg == 0.0:
        return 0.0
    return dcg / idcg

class MockGraphRAG:
    """Mock GraphRAG system for testing retrieval evaluation."""
    def retrieve(self, query_id: str) -> Dict[str, List[str]]:
        mock_data = {
            "q1": {
                "nodes": ["node_elon_musk", "node_noise1", "node_spacex", "node_tesla"],
                "edges": ["edge_founder_spacex", "edge_noise1", "edge_founder_tesla"]
            },
            "q2": {
                "nodes": ["node_microsoft", "node_github", "node_noise2"],
                "edges": ["edge_acquired_by_msft", "edge_acquisition_date"]
            },
            "q3": {
                "nodes": ["node_france", "node_paris"],
                "edges": ["edge_capital_of", "edge_noise3"]
            }
        }
        return mock_data.get(query_id, {"nodes": [], "edges": []})

def evaluate_retrieval(fixtures_path: str) -> Dict[str, Any]:
    with open(fixtures_path, 'r') as f:
        ground_truth_cases = json.load(f)

    mock_rag = MockGraphRAG()

    results = []

    for case in ground_truth_cases:
        query_id = case["query_id"]
        gt_nodes = set(case.get("ground_truth_nodes", []))
        gt_edges = set(case.get("ground_truth_edges", []))

        gt_elements = gt_nodes.union(gt_edges)

        retrieved_data = mock_rag.retrieve(query_id)
        retrieved_nodes = retrieved_data.get("nodes", [])
        retrieved_edges = retrieved_data.get("edges", [])
        retrieved_elements = retrieved_nodes + retrieved_edges

        precision = compute_precision(retrieved_elements, gt_elements)
        recall = compute_recall(retrieved_elements, gt_elements)
        f1 = compute_f1(precision, recall)
        mrr = compute_mrr(retrieved_elements, gt_elements)
        ndcg = compute_ndcg(retrieved_elements, gt_elements)

        results.append({
            "query_id": query_id,
            "metrics": {
                "precision": precision,
                "recall": recall,
                "f1": f1,
                "mrr": mrr,
                "ndcg": ndcg
            }
        })

    num_queries = len(results)
    if num_queries == 0:
        return {}

    avg_precision = sum(r["metrics"]["precision"] for r in results) / num_queries
    avg_recall = sum(r["metrics"]["recall"] for r in results) / num_queries
    avg_f1 = sum(r["metrics"]["f1"] for r in results) / num_queries
    avg_mrr = sum(r["metrics"]["mrr"] for r in results) / num_queries
    avg_ndcg = sum(r["metrics"]["ndcg"] for r in results) / num_queries

    summary = {
        "summary": {
            "avg_precision": avg_precision,
            "avg_recall": avg_recall,
            "avg_f1": avg_f1,
            "avg_mrr": avg_mrr,
            "avg_ndcg": avg_ndcg,
            "total_queries": num_queries
        },
        "query_results": results
    }

    return summary

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--fixtures", default="evals/fixtures/retrieval/ground_truth.json", help="Path to ground truth JSON")
    parser.add_argument("--output", default="evals/retrieval/metrics.json", help="Path to output JSON metrics")
    args = parser.parse_args()

    try:
        summary = evaluate_retrieval(args.fixtures)
    except FileNotFoundError:
        print(f"Error: Fixtures file not found at {args.fixtures}")
        sys.exit(1)

    with open(args.output, 'w') as f:
        json.dump(summary, f, indent=2)

    print(f"Evaluation complete. Metrics written to {args.output}")
    print(json.dumps(summary["summary"], indent=2))
