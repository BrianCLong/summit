from datetime import datetime

import sys
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parents[1]))

from intelgraph_ai_ml.graph_forecaster import GraphForecaster


def test_predict_edges_returns_predictions():
    forecaster = GraphForecaster()
    forecaster.ingest_subgraph([("a", "b", datetime(2024, 1, 1))])
    preds = forecaster.predict_edges(future_days=2)
    assert len(preds) == 2
    assert preds[0].source == "a"
    assert preds[0].target == "b"
