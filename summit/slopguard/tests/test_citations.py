import pytest

from summit.slopguard.citations import extract_citations, validate_citations


def test_extract_citations():
    text = "Check 10.1000/123456 and https://example.com/test"
    citations = extract_citations(text)
    assert "10.1000/123456" in citations["dois"]
    assert "https://example.com/test" in citations["urls"]

def test_validate_suspicious_citations():
    citations = {
        "dois": ["10.1234/example-paper"],
        "urls": ["https://example.com/paper/your-link-here"]
    }
    results = validate_citations(citations)
    assert not results["valid"]
    assert "SUSPICIOUS_DOIS: 1" in results["issues"]
    assert "SUSPICIOUS_URLS: 1" in results["issues"]

def test_validate_clean_citations():
    citations = {
        "dois": ["10.1101/2021.01.01.123456"],
        "urls": ["https://nature.com/articles/s12345-021-0123-x"]
    }
    results = validate_citations(citations)
    assert results["valid"]
    assert len(results["issues"]) == 0
