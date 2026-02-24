from summit.narrative.detectors.style import LegibilityBorrowingStyleDrift

def test_style_drift_casual_to_legal():
    detector = LegibilityBorrowingStyleDrift()

    # Casual user suddenly writes legal mumbo jumbo
    text = "Pursuant to the aforementioned statute, the liability is clear."
    actor_id = "casual_joe"
    historical_style = "casual"

    event = detector.detect(text, actor_id, historical_style, ["evd1"])

    assert event is not None
    assert event.metadata["historical_style"] == "casual"
    assert event.metadata["current_style"] == "legal"
    assert event.score > 0.8

def test_no_drift_consistent_style():
    detector = LegibilityBorrowingStyleDrift()

    text = "Pursuant to the aforementioned statute..."
    actor_id = "legal_eagle"
    historical_style = "legal"

    event = detector.detect(text, actor_id, historical_style, ["evd2"])

    assert event is None

def test_no_drift_casual_to_casual():
    detector = LegibilityBorrowingStyleDrift()

    text = "Yo check this out it's crazy."
    actor_id = "casual_joe"
    historical_style = "casual"

    event = detector.detect(text, actor_id, historical_style, ["evd3"])

    assert event is None
