import pytest
from summit.influence.patterns.library import PatternLibrary, CoordinatedDelegitimizationPattern

def test_pattern_registration():
    library = PatternLibrary()
    pattern = CoordinatedDelegitimizationPattern()
    library.register_pattern(pattern)
    assert "coordinated_delegitimization" in library.patterns

def test_coordinated_delegitimization_match():
    pattern = CoordinatedDelegitimizationPattern()
    data = {
        "text": "The election was rigged and corrupt!",
        "coordination_score": 0.9
    }
    match = pattern.match(data)
    assert match is not None
    assert match.pattern_id == "coordinated_delegitimization"
    assert match.score > 0.7
    assert "rigged" in match.matched_elements

def test_coordinated_delegitimization_no_match():
    pattern = CoordinatedDelegitimizationPattern()
    data = {
        "text": "The election results are being verified.",
        "coordination_score": 0.1
    }
    match = pattern.match(data)
    assert match is None

def test_library_scan():
    library = PatternLibrary()
    library.register_pattern(CoordinatedDelegitimizationPattern())
    data = {
        "text": "Total sabotage, fake news, and rigged election!",
        "coordination_score": 0.8
    }
    matches = library.scan(data)
    assert len(matches) == 1
    assert matches[0].pattern_id == "coordinated_delegitimization"
