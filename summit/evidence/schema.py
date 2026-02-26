# summit/evidence/schema.py

def generate_evidence_id(doc_id: str, chunk_idx: int) -> str:
    """
    Standard Evidence ID pattern.
    Must match EVD-[A-Z0-9]+-[A-Z0-9]+-[0-9]{3} for scripts/verify_evidence.py
    """
    # Clean doc_id to be uppercase alphanumeric
    clean_id = "".join(c for c in doc_id.upper() if c.isalnum())
    return f"EVD-NOTES-{clean_id}-{chunk_idx:03d}"
