"""
Simple training pipeline stub for IntelGraph.

Reads (optional) arguments from environment or stdin in the future.
Currently computes dummy metrics and writes them to stdout as JSON.
"""

import json
import sys
from datetime import datetime


def load_graph(path):
    with open(path) as f:
        obj = json.load(f)
    nodes = obj.get("nodes", [])
    edges = obj.get("edges", [])
    nbrs = {}
    for e in edges:
        u, v = e["source"], e["target"]
        nbrs.setdefault(u, set()).add(v)
        nbrs.setdefault(v, set()).add(u)
    return nodes, edges, nbrs


def common_neighbors(u, v, nbrs):
    a = nbrs.get(u, set())
    b = nbrs.get(v, set())
    return len(a & b), len(a), len(b)


def auc_score(pos_scores, neg_scores):
    # Compute AUC via rank comparison
    if not pos_scores or not neg_scores:
        return 0.0
    total = 0
    correct = 0
    for ps in pos_scores:
        for ns in neg_scores:
            total += 1
            if ps > ns:
                correct += 1
            elif ps == ns:
                correct += 0.5
    return correct / total if total else 0.0


def pr_auc_score(pos_scores, neg_scores, steps=50):
    # Approximate PR AUC by sweeping threshold
    if not pos_scores or not neg_scores:
        return 0.0
    scores = sorted(set(pos_scores + neg_scores))
    if len(scores) > steps:
        # sample thresholds
        idxs = [int(i * (len(scores) - 1) / (steps - 1)) for i in range(steps)]
        thresholds = [scores[i] for i in idxs]
    else:
        thresholds = scores
    area = 0.0
    prev_r = 0.0
    prev_p = 1.0
    P = len(pos_scores)
    for t in thresholds:
        tp = sum(1 for s in pos_scores if s >= t)
        fp = sum(1 for s in neg_scores if s >= t)
        r = tp / P if P else 0.0
        p = tp / (tp + fp) if (tp + fp) else 1.0
        area += (r - prev_r) * ((p + prev_p) / 2)
        prev_r, prev_p = r, p
    return area


def main():
    metrics = {"method": "baseline_common_neighbors"}
    if len(sys.argv) > 1:
        path = sys.argv[1]
        nodes, edges, nbrs = load_graph(path)
        # create positive and negative samples
        pos_pairs = {(e["source"], e["target"]) for e in edges}
        pos_pairs |= {(b, a) for (a, b) in pos_pairs}
        node_list = list(nodes)
        # Sample subset for speed
        pos = []
        for i, e in enumerate(edges[: min(500, len(edges))]):
            c, da, db = common_neighbors(e["source"], e["target"], nbrs)
            denom = (da + db) or 1
            pos.append(c / denom)
        neg = []
        # Generate negatives by random pairing (deterministic subsampling)
        for i in range(min(500, max(1, len(node_list) // 2))):
            u = node_list[i % len(node_list)]
            v = node_list[-(i + 1) % len(node_list)]
            if u == v or (u, v) in pos_pairs:
                continue
            c, da, db = common_neighbors(u, v, nbrs)
            denom = (da + db) or 1
            neg.append(c / denom)
        auc = float(auc_score(pos, neg)) if pos and neg else 0.0
        pr = float(pr_auc_score(pos, neg)) if pos and neg else 0.0
        metrics.update(
            {
                "auc": round(auc, 4),
                "pr_auc": round(pr, 4),
                "positives": len(pos),
                "negatives": len(neg),
                "nodes": len(nodes),
                "edges": len(edges),
            }
        )
        # Try advanced pipeline if optional deps available
        try:
            from intelgraph_py.ml.node2vec_lr import run_node2vec_lr

            adv = run_node2vec_lr(path)
            if adv:
                metrics.update(adv)
        except Exception:
            pass
    else:
        metrics.update({"auc": 0.74, "pr_auc": 0.43})
    metrics["timestamp"] = datetime.utcnow().isoformat() + "Z"
    print(json.dumps({"success": True, "metrics": metrics}))


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}))
        sys.exit(1)
