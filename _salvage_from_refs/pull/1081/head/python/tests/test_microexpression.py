import numpy as np
from intelgraph_py.analytics.vision import MicroexpressionAnalyzer, detect_faces, ingest_stream


def test_detect_faces_returns_list():
    img = np.zeros((64, 64, 3), dtype=np.uint8)
    faces = detect_faces(img)
    assert isinstance(faces, list)


def test_microexpression_streaming():
    analyzer = MicroexpressionAnalyzer(window=3)
    frames = [
        np.zeros((2, 2, 3), dtype=np.uint8),
        np.ones((2, 2, 3), dtype=np.uint8) * 10,
        np.ones((2, 2, 3), dtype=np.uint8) * 20,
    ]
    metrics = list(ingest_stream(frames, analyzer))
    assert metrics[0] is None and metrics[1] is None
    assert isinstance(metrics[2], float) and metrics[2] > 0
