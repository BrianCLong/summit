# summit/evidence/schema.py

def generate_evidence_id(doc_id: str, chunk_idx: int) -> str:
    """
    Standard Evidence ID pattern.
    """
    return f"EVID-{doc_id}-{chunk_idx}"
