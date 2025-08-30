import os
import sys

sys.path.append(os.path.abspath("."))

from intelgraph_ai_ml.graph_forecaster import GraphForecaster


def test_predict_returns_edges():
    forecaster = GraphForecaster()
    # Force deterministic interactions without Neo4j
    forecaster._fetch_recent_interactions = lambda entity_id, past_days: [
        {"source": entity_id, "target": "org-1", "timestamp": ""}
    ]
    preds = forecaster.predict("actor-1", past_days=7, future_days=30)
    assert len(preds) == 1
    p = preds[0].to_dict()
    assert set(p.keys()) == {"source", "target", "timestamp", "confidence"}
