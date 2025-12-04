from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, Iterable, List, Tuple

import networkx as nx
import numpy as np
import pandas as pd
from numpy.linalg import pinv
from scipy.stats import pearsonr
from sklearn.linear_model import LinearRegression


@dataclass
class LearnedGraph:
    graph: nx.DiGraph
    confidence: float
    paths: List[List[str]]


class StructureLearner:
    def learn(self, data: pd.DataFrame) -> LearnedGraph:
        raise NotImplementedError


class NotearsLearner(StructureLearner):
    """Lightweight NOTEARS-inspired learner using correlations and DAG ordering."""

    def __init__(self, threshold: float = 0.2):
        self.threshold = threshold

    def learn(self, data: pd.DataFrame) -> LearnedGraph:
        corr = data.corr().fillna(0)
        nodes = list(corr.columns)
        g = nx.DiGraph()
        g.add_nodes_from(nodes)
        weights: List[float] = []
        for i, src in enumerate(nodes):
            for j, tgt in enumerate(nodes):
                if i >= j:
                    continue
                w = corr.iloc[i, j]
                if abs(w) >= self.threshold:
                    g.add_edge(src, tgt, weight=float(w))
                    weights.append(abs(w))
        confidence = float(np.mean(weights) if weights else 0.0)
        paths = _enumerate_paths(g, limit=3)
        return LearnedGraph(graph=g, confidence=confidence, paths=paths)


class PCLearner(StructureLearner):
    """Constraint-based learner that prunes edges via conditional independence."""

    def __init__(self, alpha: float = 0.05):
        self.alpha = alpha

    def learn(self, data: pd.DataFrame) -> LearnedGraph:
        nodes = list(data.columns)
        g = nx.DiGraph()
        g.add_nodes_from(nodes)
        corr = data.corr().fillna(0)
        weights: List[float] = []
        for src in nodes:
            for tgt in nodes:
                if src == tgt:
                    continue
                r, _ = pearsonr(data[src], data[tgt])
                if abs(r) < 0.1:
                    continue
                conditioning = [c for c in nodes if c not in (src, tgt)]
                if conditioning:
                    cond_matrix = data[conditioning].to_numpy()
                    beta = pinv(cond_matrix.T @ cond_matrix) @ cond_matrix.T @ data[tgt].to_numpy()
                    residual = data[tgt] - cond_matrix @ beta
                    r_cond, _ = pearsonr(residual, data[src])
                else:
                    r_cond = r
                if abs(r_cond) > self.alpha:
                    weight = float(r_cond)
                    g.add_edge(src, tgt, weight=weight)
                    weights.append(abs(weight))
        g = nx.DiGraph(nx.algorithms.dag.transitive_reduction(g)) if nx.is_directed_acyclic_graph(g) else g
        confidence = float(np.mean(weights) if weights else 0.0)
        paths = _enumerate_paths(g, limit=3)
        return LearnedGraph(graph=g, confidence=confidence, paths=paths)


class GrangerLearner(StructureLearner):
    """Simplified Granger causality using lag-1 linear regression."""

    def __init__(self, max_lag: int = 1):
        self.max_lag = max_lag

    def learn(self, data: pd.DataFrame) -> LearnedGraph:
        if len(data) <= self.max_lag:
            raise ValueError("Not enough observations for Granger causality.")
        lagged = data.shift(self.max_lag).dropna()
        aligned = data.loc[lagged.index]
        g = nx.DiGraph()
        g.add_nodes_from(data.columns)
        weights: List[float] = []
        for target in data.columns:
            y = aligned[target].to_numpy()
            for source in data.columns:
                if source == target:
                    continue
                X = lagged[[source]].to_numpy()
                model = LinearRegression().fit(X, y)
                coef = float(model.coef_[0])
                if abs(coef) > 0.05:
                    g.add_edge(source, target, weight=coef)
                    weights.append(abs(coef))
        confidence = float(np.mean(weights) if weights else 0.0)
        paths = _enumerate_paths(g, limit=3)
        return LearnedGraph(graph=g, confidence=confidence, paths=paths)


def _enumerate_paths(graph: nx.DiGraph, limit: int = 3) -> List[List[str]]:
    paths: List[List[str]] = []
    for src in graph.nodes:
        for tgt in graph.nodes:
            if src == tgt:
                continue
            for path in nx.all_simple_paths(graph, source=src, target=tgt, cutoff=limit):
                paths.append(path)
                if len(paths) >= limit:
                    return paths
    return paths


def select_learner(method: str) -> StructureLearner:
    name = method.lower()
    if name == "notears":
        return NotearsLearner()
    if name == "pc":
        return PCLearner()
    if name == "granger":
        return GrangerLearner()
    raise ValueError(f"Unsupported method: {method}")
