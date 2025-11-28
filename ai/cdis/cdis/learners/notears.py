from __future__ import annotations

from typing import Iterable, List

import numpy as np
import pandas as pd
from sklearn.linear_model import LassoLars

from ..models import Edge, GraphEstimate


class NoteaRSRegression:
    """Lightweight NOTEARS-style learner using sparse regression.

    This is not a full constrained optimization solver; it approximates structure discovery by
    solving sparse regressions for each target node and orienting edges based on coefficient
    magnitude. The heuristic is deterministic and suitable for small synthetic fixtures.
    """

    def __init__(self, alpha: float = 0.05, min_weight: float = 0.05) -> None:
        self.alpha = alpha
        self.min_weight = min_weight

    def fit(self, df: pd.DataFrame) -> GraphEstimate:
        nodes = list(df.columns)
        edges: List[Edge] = []
        for target in nodes:
            predictors = [c for c in nodes if c != target]
            model = LassoLars(alpha=self.alpha, normalize=False)
            model.fit(df[predictors].values, df[target].values)
            for idx, coef in enumerate(model.coef_):
                if abs(coef) >= self.min_weight:
                    edges.append(
                        Edge(
                            source=predictors[idx],
                            target=target,
                            weight=float(coef),
                            confidence=float(min(1.0, abs(coef) * 2)),
                        )
                    )
        return GraphEstimate(nodes=nodes, edges=edges)


def noteas_confidence(graph: GraphEstimate) -> float:
    if not graph.edges:
        return 0.0
    weights = [abs(edge.weight) for edge in graph.edges]
    return float(np.tanh(np.mean(weights)))


__all__: Iterable[str] = ["NoteaRSRegression", "noteas_confidence"]
