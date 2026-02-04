import re
from typing import Dict, Any, List

# Simple DOI regex
DOI_PATTERN = re.compile(r"10\.\d{4,9}/[-._;()/:a-zA-Z0-9]+")
# Simple URL regex
URL_PATTERN = re.compile(r"https?://[^\s]+")

def extract_citations(text: str) -> Dict[str, List[str]]:
    """Extracts DOIs and URLs from text."""
    dois = DOI_PATTERN.findall(text)
    urls = URL_PATTERN.findall(text)
    return {
        "dois": dois,
        "urls": urls
    }

def validate_citations(citations: Dict[str, List[str]]) -> Dict[str, Any]:
    """
    Validates citations.
    """
    dois = citations.get("dois", [])
    urls = citations.get("urls", [])

    issues = []

    # Heuristic: DOIs that look suspicious (e.g. placeholder-like)
    suspicious_dois = [d for d in dois if "example-paper" in d.lower() or "12345-stub" in d]
    if suspicious_dois:
        issues.append(f"SUSPICIOUS_DOIS: {len(suspicious_dois)}")

    # Heuristic: URLs that look like common LLM hallucinations
    suspicious_urls = [u for u in urls if "your-link-here" in u or "example.com/paper-stub" in u]
    if suspicious_urls:
        issues.append(f"SUSPICIOUS_URLS: {len(suspicious_urls)}")

    return {
        "valid": len(issues) == 0,
        "issues": issues,
        "counts": {
            "dois": len(dois),
            "urls": len(urls)
        }
    }
