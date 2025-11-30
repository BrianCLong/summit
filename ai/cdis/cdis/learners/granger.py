from __future__ import annotations

from typing import Iterable, List

import numpy as np
import pandas as pd
from statsmodels.tsa.stattools import grangercausalitytests

from ..models import Edge, GraphEstimate


class GrangerCausality:
    def __init__(self, maxlag: int = 2, pvalue_threshold: float = 0.05) -> None:
        self.maxlag = maxlag
        self.pvalue_threshold = pvalue_threshold

    def fit(self, df: pd.DataFrame) -> GraphEstimate:
        nodes = list(df.columns)
        edges: List[Edge] = []
        for target in nodes:
            for source in nodes:
                if source == target:
                    continue
                series = df[[target, source]].dropna().values
                try:
                    result = grangercausalitytests(series, maxlag=self.maxlag, verbose=False)
                except ValueError:
                    continue
                best_p = min(test[0]["ssr_ftest"][1] for test in result.values())
                if best_p <= self.pvalue_threshold:
                    score = 1 - best_p
                    edges.append(
                        Edge(
                            source=source,
                            target=target,
                            weight=float(score),
                            confidence=float(score),
                        )
                    )
        return GraphEstimate(nodes=nodes, edges=edges)


def granger_confidence(graph: GraphEstimate) -> float:
    if not graph.edges:
        return 0.0
    return float(np.mean([edge.confidence for edge in graph.edges]))


__all__: Iterable[str] = ["GrangerCausality", "granger_confidence"]
