import re
from typing import Dict, List, Any

def verify_citations(citations: List[Dict[str, str]]) -> Dict[str, Any]:
    """
    Verifies a list of citations.
    citations: [{"doi": "...", "url": "...", "text": "..."}]
    """
    failures = []

    doi_pattern = r'^10\.\d{4,9}/[-._;()/:a-zA-Z0-9]+$'

    for i, cit in enumerate(citations):
        doi = cit.get("doi")
        url = cit.get("url")

        if doi and not re.match(doi_pattern, doi):
            failures.append(f"malformed_doi:index_{i}")

        if url and not (url.startswith("http://") or url.startswith("https://")):
            failures.append(f"malformed_url:index_{i}")

    return {
        "pass": len(failures) == 0,
        "failures": failures,
        "count": len(citations)
    }
