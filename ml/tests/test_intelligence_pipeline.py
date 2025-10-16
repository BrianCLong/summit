import numpy as np
import torch
from app.pipelines import IntelligencePipeline


def test_pipeline_end_to_end():
    pipe = IntelligencePipeline()

    # Translation should return a string
    text = pipe.translate_text("hola")
    assert isinstance(text, str)

    # Entity extraction should identify capitalised words
    entities = pipe.extract_entities("IntelGraph Builds AI")
    assert "IntelGraph" in entities

    # Anomaly detection returns prediction for each sample
    vectors = np.random.rand(8, 4)
    preds = pipe.detect_anomalies(vectors)
    assert preds.shape[0] == vectors.shape[0]

    # Threat forecasting returns a float
    forecast = pipe.forecast_threats([1, 3, 2, 5])
    assert isinstance(forecast, float)

    # Vision model produces probability distribution
    image = torch.rand(1, 3, 224, 224)
    probs = pipe.analyse_image(image)
    assert probs.shape == (1, 1000)
    assert torch.isclose(probs.sum(), torch.tensor(1.0), atol=1e-5)


def test_forecast_alert_and_retraining():
    pipe = IntelligencePipeline()
    triggered: list[float] = []

    pipe.add_alert_callback(lambda x: triggered.append(x))
    pred = pipe.forecast_and_alert([1, 2, 3, 4, 5], threshold=4)
    assert triggered and isinstance(pred, float)

    version = pipe._model_version
    pipe.update_forecast_performance(actual=100.0, window=1, degrade_threshold=10.0)
    assert pipe._model_version == version + 1
