from __future__ import annotations
import json
import random
from collections import defaultdict
from typing import Dict, List, Tuple

import networkx as nx
import numpy as np
from gensim.models import Word2Vec
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import roc_auc_score, average_precision_score


def load_snapshot(path: str) -> Tuple[List[str], List[Tuple[str, str]]]:
    with open(path, 'r') as f:
        obj = json.load(f)
    nodes = list(obj.get('nodes') or [])
    edges = [(e['source'], e['target']) for e in obj.get('edges') or []]
    return nodes, edges


def build_graph(nodes: List[str], edges: List[Tuple[str, str]]) -> nx.Graph:
    G = nx.Graph()
    G.add_nodes_from(nodes)
    G.add_edges_from(edges)
    return G


def generate_random_walks(G: nx.Graph, walk_length: int = 10, num_walks: int = 10, seed: int = 42) -> List[List[str]]:
    rng = random.Random(seed)
    nodes = list(G.nodes())
    walks: List[List[str]] = []
    for _ in range(num_walks):
        rng.shuffle(nodes)
        for n in nodes:
            walk = [n]
            current = n
            for _ in range(walk_length - 1):
                neighbors = list(G.neighbors(current))
                if not neighbors:
                    break
                current = rng.choice(neighbors)
                walk.append(str(current))
            walks.append([str(x) for x in walk])
    return walks


def train_deepwalk_embeddings(G: nx.Graph, dimensions: int = 64, walk_length: int = 10, num_walks: int = 10, window_size: int = 5, workers: int = 1, seed: int = 42) -> Dict[str, np.ndarray]:
    walks = generate_random_walks(G, walk_length=walk_length, num_walks=num_walks, seed=seed)
    model = Word2Vec(sentences=walks, vector_size=dimensions, window=window_size, min_count=0, sg=1, workers=workers, seed=seed, epochs=5)
    emb = {}
    for n in G.nodes():
        key = str(n)
        if key in model.wv:
            emb[key] = model.wv[key].astype(float)
        else:
            emb[key] = np.zeros(dimensions, dtype=float)
    return emb


def split_edges(edges: List[Tuple[str, str]], test_ratio: float = 0.2, seed: int = 42):
    rng = random.Random(seed)
    e = edges[:]
    rng.shuffle(e)
    split = int(len(e) * (1 - test_ratio))
    return e[:split], e[split:]


def sample_non_edges(G: nx.Graph, k: int, seed: int = 42) -> List[Tuple[str, str]]:
    rng = random.Random(seed)
    non_edges = []
    nodes = list(G.nodes())
    attempts = 0
    limit = k * 10 + 100
    while len(non_edges) < k and attempts < limit:
        u = rng.choice(nodes)
        v = rng.choice(nodes)
        if u == v or G.has_edge(u, v):
            attempts += 1
            continue
        pair = (u, v) if u < v else (v, u)
        if pair not in non_edges:
            non_edges.append(pair)
        attempts += 1
    return non_edges


def edge_features(u: str, v: str, emb: Dict[str, np.ndarray]) -> np.ndarray:
    a = emb.get(str(u))
    b = emb.get(str(v))
    if a is None or b is None:
        return np.zeros(128, dtype=float)
    # Use concatenation + hadamard
    had = a * b
    return np.concatenate([a, b])  # simple concatenation


def train_lr_linkpred(G: nx.Graph, emb: Dict[str, np.ndarray], train_pos, train_neg, test_pos, test_neg):
    X_train = []
    y_train = []
    for (u, v) in train_pos:
        X_train.append(edge_features(u, v, emb))
        y_train.append(1)
    for (u, v) in train_neg:
        X_train.append(edge_features(u, v, emb))
        y_train.append(0)

    X_test = []
    y_test = []
    for (u, v) in test_pos:
        X_test.append(edge_features(u, v, emb))
        y_test.append(1)
    for (u, v) in test_neg:
        X_test.append(edge_features(u, v, emb))
        y_test.append(0)

    if not X_train or not X_test:
        return {"auc": 0.0, "pr_auc": 0.0}

    X_train = np.vstack(X_train)
    y_train = np.array(y_train)
    X_test = np.vstack(X_test)
    y_test = np.array(y_test)

    clf = LogisticRegression(max_iter=1000)
    clf.fit(X_train, y_train)
    prob = clf.predict_proba(X_test)[:, 1]
    try:
        auc = float(roc_auc_score(y_test, prob))
        pr_auc = float(average_precision_score(y_test, prob))
    except Exception:
        auc = 0.0
        pr_auc = 0.0
    return {"auc": round(auc, 4), "pr_auc": round(pr_auc, 4)}


def run_node2vec_lr(snapshot_path: str, seed: int = 42) -> dict:
    nodes, edges = load_snapshot(snapshot_path)
    if not nodes or not edges:
        return {"auc": 0.0, "pr_auc": 0.0, "nodes": len(nodes), "edges": len(edges)}
    G = build_graph(nodes, edges)
    train_pos, test_pos = split_edges(edges, test_ratio=0.2, seed=seed)
    # Remove test edges from graph for embedding training
    G_train = build_graph(nodes, train_pos)
    train_neg = sample_non_edges(G_train, k=len(train_pos), seed=seed)
    test_neg = sample_non_edges(G_train, k=len(test_pos), seed=seed + 1)
    emb = train_deepwalk_embeddings(G_train, dimensions=64, walk_length=10, num_walks=10, window_size=5, workers=1, seed=seed)
    metrics = train_lr_linkpred(G_train, emb, train_pos, train_neg, test_pos, test_neg)
    metrics.update({"nodes": len(nodes), "edges": len(edges), "method": "deepwalk_lr"})
    return metrics

