def chunk_markdown(text: str, max_tokens: int = 512) -> list[str]:
    paragraphs = text.split("\n\n")
    chunks = []
    buffer = []
    for p in paragraphs:
        if not p.strip(): continue
        current_len = len(" ".join(buffer + [p]).split())
        if current_len > max_tokens and buffer:
            chunks.append("\n\n".join(buffer))
            buffer = [p]
        else:
            buffer.append(p)
    if buffer:
        chunks.append("\n\n".join(buffer))
    return chunks
