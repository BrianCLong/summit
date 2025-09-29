import asyncio

from timeline_model import predict_timeline


def test_predict_timeline_returns_message():
    result = asyncio.run(predict_timeline(3))
    assert "prediction" in result
    assert "3" in result["prediction"]
