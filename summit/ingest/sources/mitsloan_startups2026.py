"""
Source adapter: MIT Sloan '8 MIT startups to watch in 2026'
Public source. Extract only what is present in the article; do not enrich here.
"""

from dataclasses import dataclass
from typing import Dict, List

SOURCE_URL = "https://mitsloan.mit.edu/ideas-made-to-matter/mit-startups-to-watch-2026"
PUBLISHED_DATE = "2026-01-26"

STARTUPS = [
    "Blue Sarah",
    "Evoloh",
    "Manolin",
    "Provocative",
    "Satellite Bio",
    "Tessel Biosciences",
    "Undermind",
    "Veir",
]

@dataclass(frozen=True)
class ExtractedStartup:
    startup_name: str
    problem: str
    solution: str
    mechanism: List[str]
    claims: List[Dict]

def extract_from_article_text(article_text: str) -> List[ExtractedStartup]:
    """
    TODO: Implement deterministic parsing based on headings + labeled fields.
    For now, require fixtures to provide already-separated sections.
    """
    raise NotImplementedError("TODO(ingest): deterministic parser")

def to_profile_v1(x: ExtractedStartup) -> Dict:
    return {
        "startup_name": x.startup_name,
        "source": {"url": SOURCE_URL, "published_date": PUBLISHED_DATE},
        "sector_tags": [],
        "problem": x.problem,
        "solution": x.solution,
        "mechanism": x.mechanism,
        "claims": x.claims,
        "trust_tier": "sourced",
        "assumptions": [],
    }
