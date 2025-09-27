from ml.app.disinformation_detection import DisinformationDetector


def test_detector_flags_duplicates():
    detector = DisinformationDetector()
    items = [
        {
            "text": "The moon is made of cheese",
            "metadata": {"bot_score": 0.9, "threat_actor": "cheese_bot"},
        },
        {"text": "The moon is made of cheese", "metadata": {"bot_score": 0.85}},
        {"text": "The earth is round", "metadata": {"bot_score": 0.1}},
    ]

    results = detector.detect(items)
    assert results, "Detector should identify coordinated content"
    first = results[0]
    assert first["disinfo"] is True
    assert 0 <= first["confidence"] <= 1
    assert "counter_strategy" in first
    assert first["counter_strategy"]["reframe"].startswith("Present evidence")
