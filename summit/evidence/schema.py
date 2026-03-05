def generate_evidence_id(doc_id: str, chunk_idx: int) -> str:
    clean_id = "".join(c for c in doc_id.upper() if c.isalnum())
    return f"EVD-NOTES-{clean_id}-{chunk_idx:03d}"
