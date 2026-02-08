import pytest
from cogsec_fusion.detection.spoof_site import SpoofDetector

def test_domain_spoof():
    detector = SpoofDetector(protected_domains=["example.com"])

    # Exact match
    matches = detector.check_domain("example.com")
    assert any(d == "example.com" for d, c in matches)

    # Typo
    matches = detector.check_domain("examplle.com")
    assert any(d == "example.com" for d, c in matches)

    # No match
    matches = detector.check_domain("google.com")
    assert not matches

def test_content_spoof():
    detector = SpoofDetector(protected_domains=[])
    content = "<html>Welcome to Example Bank login</html>"
    score = detector.check_content(content, keywords=["Example Bank"])
    assert score > 0.0

    score = detector.check_content(content, keywords=["Other Bank"])
    assert score == 0.0
