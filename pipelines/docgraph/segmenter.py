import uuid


def segment_document(text):
    # Minimal deterministic segmentation by double newline (paragraphs)
    segments = []
    start = 0
    lines = text.split('\n\n')
    for line in lines:
        if not line.strip():
            start += len(line) + 2
            continue
        end = start + len(line)
        segments.append({
            "id": str(uuid.uuid5(uuid.NAMESPACE_DNS, f"{start}-{end}-{line[:10]}")),
            "parent_id": None,
            "type": "paragraph",
            "start": start,
            "end": end,
            "text": line
        })
        start = end + 2 # account for \n\n
    return segments
