from summit.narrative.detectors.roles import RoleProfile, RoleInversionDetector

def test_role_inversion_detected():
    # Setup profile: strict amplifier, strict defender
    profile = RoleProfile(actor_id="actor_1")
    for _ in range(10):
        profile.update("amplify", "defender")

    assert profile.primary_role == "amplifier"
    assert profile.primary_stance == "defender"

    detector = RoleInversionDetector(profiles={"actor_1": profile}, threshold=0.5)

    # Inversion event: originate + critic (double inversion)
    event_window = {"start": "2026-02-04T10:00:00Z", "end": "2026-02-04T12:00:00Z"}

    event = detector.detect("actor_1", "originate", "critic", event_window, ["evd1"])

    assert event is not None
    assert event.score >= 0.5
    assert event.metadata["historical_role"] == "amplifier"
    assert event.metadata["current_action"] == "originate"

def test_no_inversion_consistent_behavior():
    profile = RoleProfile(actor_id="actor_2")
    for _ in range(10):
        profile.update("originate", "critic")

    detector = RoleInversionDetector(profiles={"actor_2": profile}, threshold=0.5)
    event_window = {"start": "2026-02-04T10:00:00Z", "end": "2026-02-04T12:00:00Z"}

    event = detector.detect("actor_2", "originate", "critic", event_window, ["evd2"])

    assert event is None

def test_role_inversion_threshold():
    # Setup profile: amplifier, mixed stance
    profile = RoleProfile(actor_id="actor_3")
    for _ in range(10):
        profile.update("amplify", "defender")
    for _ in range(8):
        profile.update("amplify", "critic")

    assert profile.primary_role == "amplifier"
    assert profile.primary_stance == "mixed"

    # Set high threshold (need double inversion)
    detector = RoleInversionDetector(profiles={"actor_3": profile}, threshold=1.0)

    event_window = {"start": "2026-02-04T10:00:00Z", "end": "2026-02-04T12:00:00Z"}

    # Only single inversion (originate) -> score 0.5 (from implementation: originate(0.5) + mixed(0) < 1.0)
    event = detector.detect("actor_3", "originate", "critic", event_window, ["evd3"])

    assert event is None
