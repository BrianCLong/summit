from summit.narrative.detectors.ambiguity import AmbiguitySpikeDetector

def test_ambiguity_spike_detected():
    detector = AmbiguitySpikeDetector()

    pre_event = ["The sky is blue", "Water is wet", "Facts are clear"]
    post_event = ["It is unclear what happened", "Reports are conflicting", "Maybe it was aliens", "Situation is fluid"]

    event_window = {"start": "2026-02-04T12:00:00Z", "end": "2026-02-04T14:00:00Z"}

    event = detector.detect(pre_event, post_event, event_window, ["evd1"])

    assert event is not None
    assert float(event.metadata["post_score"]) == 1.0
    assert float(event.metadata["pre_score"]) == 0.0

def test_no_spike_consistent_ambiguity():
    detector = AmbiguitySpikeDetector()

    pre_event = ["Unclear outcome", "Maybe tomorrow"]
    post_event = ["Unclear outcome", "Maybe tomorrow"]

    event_window = {"start": "2026-02-04T12:00:00Z", "end": "2026-02-04T14:00:00Z"}

    event = detector.detect(pre_event, post_event, event_window, ["evd2"])

    assert event is None

def test_no_spike_low_level():
    detector = AmbiguitySpikeDetector()

    pre_event = ["Clear"]
    post_event = ["Clear", "Unclear"] # 0.5 score

    # 0 -> 0.5 is > 1.5x, and > 0.3. So this should trigger.

    event_window = {"start": "2026-02-04T12:00:00Z", "end": "2026-02-04T14:00:00Z"}
    event = detector.detect(pre_event, post_event, event_window, ["evd3"])

    assert event is not None
