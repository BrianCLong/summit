from summit.slopguard.citations import verify_citations


def test_valid_citations():
    citations = [
        {"doi": "10.1000/182", "url": "https://doi.org/10.1000/182"},
        {"url": "https://example.com"}
    ]
    result = verify_citations(citations)
    assert result["pass"] == True
    assert result["count"] == 2

def test_invalid_citations():
    citations = [
        {"doi": "not-a-doi", "url": "ftp://invalid"},
    ]
    result = verify_citations(citations)
    assert result["pass"] == False
    assert "malformed_doi:index_0" in result["failures"]
    assert "malformed_url:index_0" in result["failures"]
