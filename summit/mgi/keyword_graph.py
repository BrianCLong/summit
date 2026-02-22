from typing import Iterable, Dict, List, Set, Any
from .tokenize import tokenize
from .config import MGIConfig

def build_edges(chunks: Iterable[Dict[str, Any]], config: MGIConfig) -> List[Dict[str, str]]:
    """
    Returns edge records: {chunk_id, keyword}
    Intended ingestion: (:Chunk {id})-[:HAS_KEYWORD]->(:Keyword {term})

    Enforces config.keyword_max_degree: if a keyword appears in more than
    keyword_max_degree chunks (within this batch), subsequent edges are dropped.
    """
    edges = []
    keyword_counts: Dict[str, int] = {}

    # Ensure stable ordering of chunks if possible, but input is iterable.
    # We rely on input order.

    for chunk in chunks:
        c_id = chunk.get("id")
        if not c_id:
            continue

        text = chunk.get("text", "")
        if not text:
            continue

        # Tokenize and get unique keywords for this chunk
        keywords = set(tokenize(text))

        # Sort for determinism per chunk
        for kw in sorted(list(keywords)):
            current_count = keyword_counts.get(kw, 0)

            if current_count < config.keyword_max_degree:
                edges.append({"chunk_id": c_id, "keyword": kw})
                keyword_counts[kw] = current_count + 1
            else:
                # Cap hit for this keyword
                continue

    return edges
