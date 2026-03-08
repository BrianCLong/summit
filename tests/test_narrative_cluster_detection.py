from summit.influence.coordination_detector import CoordinationDetector


def test_campaign_detector():
    detector = CoordinationDetector()
    scores = detector.detect([])
    assert scores["campaign_score"] == 0.85
