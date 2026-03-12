import json
import math
import os

def load_fixtures(path):
    with open(path, 'r') as f:
        return json.load(f)['queries']

def calculate_precision_at_k(retrieved, ground_truth, k):
    retrieved_k = retrieved[:k]
    if not retrieved_k:
        return 0.0
    relevant_retrieved = set(retrieved_k).intersection(set(ground_truth))
    return len(relevant_retrieved) / k

def calculate_recall_at_k(retrieved, ground_truth, k):
    if not ground_truth:
        return 1.0 # If there's no ground truth, recall is 1.0 if we retrieved anything or nothing? Let's say 1.0.
    retrieved_k = retrieved[:k]
    relevant_retrieved = set(retrieved_k).intersection(set(ground_truth))
    return len(relevant_retrieved) / len(ground_truth)

def calculate_mrr(retrieved, ground_truth):
    if not ground_truth:
        return 0.0
    for i, doc in enumerate(retrieved):
        if doc in ground_truth:
            return 1.0 / (i + 1)
    return 0.0

def calculate_dcg(retrieved, relevance_scores, k):
    dcg = 0.0
    for i, doc in enumerate(retrieved[:k]):
        rel = relevance_scores.get(doc, 0)
        dcg += rel / math.log2(i + 2)
    return dcg

def calculate_ndcg_at_k(retrieved, ground_truth, relevance_scores, k):
    if not ground_truth:
        return 1.0

    # Calculate DCG
    dcg = calculate_dcg(retrieved, relevance_scores, k)

    # Calculate IDCG
    ideal_retrieved = sorted(ground_truth, key=lambda x: relevance_scores.get(x, 0), reverse=True)
    idcg = calculate_dcg(ideal_retrieved, relevance_scores, k)

    if idcg == 0.0:
        return 0.0
    return dcg / idcg

def evaluate_retrieval(queries, k_values=[3, 5]):
    results = []

    in_dist_mrr = []
    out_dist_mrr = []

    for query in queries:
        qid = query['id']
        q_type = query['type']
        ground_truth = query['ground_truth_docs']
        relevance_scores = query.get('relevance_scores', {})
        retrieved = query['mock_retrieved_docs']

        query_metrics = {
            "id": qid,
            "query": query['query'],
            "type": q_type,
            "metrics": {}
        }

        # Calculate for different K
        for k in k_values:
            query_metrics["metrics"][f"precision@{k}"] = calculate_precision_at_k(retrieved, ground_truth, k)
            query_metrics["metrics"][f"recall@{k}"] = calculate_recall_at_k(retrieved, ground_truth, k)
            query_metrics["metrics"][f"ndcg@{k}"] = calculate_ndcg_at_k(retrieved, ground_truth, relevance_scores, k)

            # Top-K hit rate (at least one relevant document retrieved in top K)
            hit = 1 if set(retrieved[:k]).intersection(set(ground_truth)) else 0
            query_metrics["metrics"][f"hit_rate@{k}"] = hit

            # Crowding out (Irrelevant chunks crowding out relevant ones)
            # We define this as the number of irrelevant chunks that appear before the first relevant chunk
            crowding_out = 0
            if ground_truth:
                for doc in retrieved[:k]:
                    if doc not in ground_truth:
                        crowding_out += 1
                    else:
                        break
            query_metrics["metrics"][f"crowding_out@{k}"] = crowding_out

        mrr = calculate_mrr(retrieved, ground_truth)
        query_metrics["metrics"]["mrr"] = mrr

        if q_type == "in-distribution":
            in_dist_mrr.append(mrr)
        elif q_type == "out-of-distribution" and ground_truth: # Only evaluate OOD with ground truth
            out_dist_mrr.append(mrr)

        results.append(query_metrics)

    avg_in_dist_mrr = sum(in_dist_mrr) / len(in_dist_mrr) if in_dist_mrr else 0
    avg_out_dist_mrr = sum(out_dist_mrr) / len(out_dist_mrr) if out_dist_mrr else 0
    ood_degradation = avg_in_dist_mrr - avg_out_dist_mrr

    return {
        "queries": results,
        "aggregate_metrics": {
            "avg_in_distribution_mrr": avg_in_dist_mrr,
            "avg_out_distribution_mrr": avg_out_dist_mrr,
            "ood_degradation": ood_degradation
        }
    }

if __name__ == "__main__":
    fixtures_path = os.path.join(os.path.dirname(__file__), "../fixtures/retrieval-quality/dataset.json")
    queries = load_fixtures(fixtures_path)
    report = evaluate_retrieval(queries)

    report_path = os.path.join(os.path.dirname(__file__), "report.json")
    with open(report_path, "w") as f:
        json.dump(report, f, indent=2)

    print(f"Evaluation report generated at {report_path}")
