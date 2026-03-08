def analyze_narrative_overlap(response_text, narratives):
    """
    Test if LLM outputs echo narratives.
    """
    overlap_score = 0.0
    matched_narratives = []
    response_lower = response_text.lower()
    for narrative in narratives:
        if narrative.lower() in response_lower:
            overlap_score += 1.0
            matched_narratives.append(narrative)

    if len(narratives) > 0:
        overlap_score /= len(narratives)

    return {
        'overlap_score': overlap_score,
        'matched_narratives': matched_narratives
    }
