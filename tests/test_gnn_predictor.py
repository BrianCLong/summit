import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from gnn_predictor import GNNPredictor


def test_predictions_sorted_by_confidence():
    predictor = GNNPredictor()
    preds = predictor.predict()
    confidences = [p["confidence"] for p in preds]
    assert confidences == sorted(confidences, reverse=True)
    assert all("source" in p and "target" in p for p in preds)
