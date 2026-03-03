from collections import Counter
import re

def classify_repetition(prompt: str) -> dict:
    """Classifies prompt repetition into beneficial, harmful, or none."""
    # Split into sentences
    sentences = re.split(r'[.!?]\s+', prompt)
    counts = Counter(sentences)

    # Identify repeated strings
    repeated = {s:c for s,c in counts.items() if c > 1}

    if not repeated:
        return {"class": "none", "score": 0}

    reinforcement_score = sum(len(s) for s in repeated)

    if reinforcement_score < 200:
        return {"class": "beneficial", "score": reinforcement_score}
    else:
        return {"class": "harmful", "score": reinforcement_score}
