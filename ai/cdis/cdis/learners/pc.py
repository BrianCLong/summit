from __future__ import annotations

import itertools
from typing import Iterable, List

import networkx as nx
import numpy as np
import pandas as pd
from scipy import stats

from ..models import Edge, GraphEstimate


class PCAlgorithm:
    def __init__(self, alpha: float = 0.01, min_weight: float = 0.05) -> None:
        self.alpha = alpha
        self.min_weight = min_weight

    def _conditional_independent(self, x: np.ndarray, y: np.ndarray, z: np.ndarray) -> bool:
        if z.size == 0:
            corr, p_value = stats.pearsonr(x, y)
            return p_value > self.alpha or abs(corr) < self.min_weight
        # regress out z
        beta_x, _, _, _ = np.linalg.lstsq(z, x, rcond=None)
        beta_y, _, _, _ = np.linalg.lstsq(z, y, rcond=None)
        resid_x = x - z @ beta_x
        resid_y = y - z @ beta_y
        corr, p_value = stats.pearsonr(resid_x, resid_y)
        return p_value > self.alpha or abs(corr) < self.min_weight

    def fit(self, df: pd.DataFrame) -> GraphEstimate:
        nodes = list(df.columns)
        g = nx.complete_graph(nodes)
        sep_sets = {node: {} for node in nodes}

        # edge removal based on conditional independence up to order 2
        for order in range(0, min(2, len(nodes)) + 1):
            edges_to_remove = []
            for (u, v) in g.edges():
                neighbors = [n for n in g.neighbors(u) if n != v]
                if len(neighbors) < order:
                    continue
                for cond_set in itertools.combinations(neighbors, order):
                    z = df[list(cond_set)].values
                    if self._conditional_independent(
                        df[u].values, df[v].values, z
                    ):
                        edges_to_remove.append((u, v))
                        sep_sets[u][v] = cond_set
                        sep_sets[v][u] = cond_set
                        break
            g.remove_edges_from(edges_to_remove)

        directed_edges: List[Edge] = []
        # orient using p-value asymmetry
        for (u, v) in g.edges():
            corr_uv, p_uv = stats.pearsonr(df[u].values, df[v].values)
            corr_vu, p_vu = stats.pearsonr(df[v].values, df[u].values)
            if p_uv <= p_vu:
                directed_edges.append(
                    Edge(source=u, target=v, weight=float(corr_uv), confidence=float(1 - p_uv))
                )
            else:
                directed_edges.append(
                    Edge(source=v, target=u, weight=float(corr_vu), confidence=float(1 - p_vu))
                )

        return GraphEstimate(nodes=nodes, edges=directed_edges)


def pc_confidence(graph: GraphEstimate) -> float:
    if not graph.edges:
        return 0.0
    return float(np.mean([edge.confidence for edge in graph.edges]))


__all__: Iterable[str] = ["PCAlgorithm", "pc_confidence"]
