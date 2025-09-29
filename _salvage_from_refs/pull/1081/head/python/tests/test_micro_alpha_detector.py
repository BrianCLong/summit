import pathlib
import sys
from datetime import datetime, timedelta

import pandas as pd

sys.path.append(str(pathlib.Path(__file__).resolve().parent.parent))
from micro_alpha_detector import MicroAlphaDetector, NewsItem


def test_micro_alpha_detector_generates_signal():
    news = [
        NewsItem(timestamp=datetime(2023, 1, 1, 9, 0), text="AAPL strong sales", symbols=["AAPL"]),
        NewsItem(
            timestamp=datetime(2023, 1, 1, 10, 0), text="AAPL product recall", symbols=["AAPL"]
        ),
        NewsItem(
            timestamp=datetime(2023, 1, 1, 11, 0), text="AAPL steady demand", symbols=["AAPL"]
        ),
    ]
    price_data = pd.DataFrame(
        [
            {"timestamp": datetime(2023, 1, 1, 9, 0), "symbol": "AAPL", "price": 100.0},
            {"timestamp": datetime(2023, 1, 1, 9, 30), "symbol": "AAPL", "price": 105.0},
            {"timestamp": datetime(2023, 1, 1, 10, 0), "symbol": "AAPL", "price": 102.0},
            {"timestamp": datetime(2023, 1, 1, 10, 30), "symbol": "AAPL", "price": 100.0},
            {"timestamp": datetime(2023, 1, 1, 11, 0), "symbol": "AAPL", "price": 101.0},
            {"timestamp": datetime(2023, 1, 1, 11, 30), "symbol": "AAPL", "price": 101.0},
        ]
    )

    detector = MicroAlphaDetector([])
    signals = detector.analyze(news, price_data, horizon=timedelta(minutes=30))

    assert len(signals) == 1
    s = signals[0]
    assert s.asset == "AAPL"
    assert -1.0 <= s.strength <= 1.0
    assert s.confidence_low <= s.confidence_high
