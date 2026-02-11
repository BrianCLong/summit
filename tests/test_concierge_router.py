import pytest
from summit.self_evolve.concierge import ConciergeRouter, SpecialistRegistry, MetaCognitionEngine

def test_concierge_hires_specialist():
    registry = SpecialistRegistry()
    router = ConciergeRouter(registry, max_hires=2)

    specialist = router.hire_specialist("writing_code")
    assert specialist is not None
    assert specialist["id"] == "coder"
    assert len(router.active_hires) == 1

def test_concierge_lru_eviction():
    registry = SpecialistRegistry()
    router = ConciergeRouter(registry, max_hires=2)

    router.hire_specialist("writing_code") # coder
    router.hire_specialist("gathering_info") # researcher

    assert len(router.active_hires) == 2

    # Hiring a third should evict the first (coder)
    router.hire_specialist("policy_validation") # reviewer

    assert len(router.active_hires) == 2
    assert router.active_hires[0]["id"] == "researcher"
    assert router.active_hires[1]["id"] == "reviewer"

def test_meta_cognition_detects_gap():
    engine = MetaCognitionEngine()
    trace = [
        {"step": 1, "action": "search"},
        {"step": 2, "error": "capability not supported: advanced_math"}
    ]

    gap = engine.detect_gap(trace)
    assert gap == "capability_gap"
