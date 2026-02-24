import re
from typing import Set, List

# Minimal stoplist for English
STOPWORDS: Set[str] = {
    "a", "an", "the", "and", "or", "but", "if", "then", "else", "when",
    "at", "by", "for", "from", "in", "into", "of", "off", "on", "onto",
    "to", "with", "is", "are", "was", "were", "be", "been", "being",
    "that", "this", "these", "those", "it", "its", "he", "him", "his",
    "she", "her", "hers", "they", "them", "their", "we", "us", "our",
    "i", "me", "my", "you", "your", "yours", "not", "no", "can", "will"
}

def tokenize(text: str) -> List[str]:
    """
    Deterministic tokenizer: lowercase, strip non-alphanumeric, filter stopwords.
    Returns a list of tokens.
    """
    if not text:
        return []

    # Lowercase
    text = text.lower()

    # Split by non-alphanumeric (keep only a-z0-9)
    tokens = re.findall(r'\b[a-z0-9]+\b', text)

    # Filter stopwords and short tokens (<= 2 chars)
    return [t for t in tokens if t not in STOPWORDS and len(t) > 2]
