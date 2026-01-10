import re
from collections import Counter
from collections.abc import Iterable

from .models import Document, FactCheckIssue, FactCheckReport


def _split_sentences(text: str) -> list[str]:
    cleaned = re.sub(r"\s+", " ", text.strip())
    return [s.strip() for s in re.split(r"(?<=[.!?])\s+", cleaned) if s.strip()]


def _token_overlap(sentence: str, document: str) -> float:
    tokens = [token.lower() for token in re.findall(r"\b\w+\b", sentence)]
    if not tokens:
        return 0.0
    doc_tokens = Counter(re.findall(r"\b\w+\b", document.lower()))
    match_count = sum(doc_tokens.get(token, 0) for token in tokens)
    return match_count / len(tokens)


def fact_check_summary(
    summary: str, documents: Iterable[Document], *, threshold: float = 0.4
) -> FactCheckReport:
    """Performs a lightweight lexical fact check over the generated summary.

    The checker is intentionally conservative: it looks for lexical support for
    each sentence within at least one source document. This is not a full
    semantic fact checker, but it provides a quick signal about unsupported
    claims before sending work to a heavier QA model.
    """

    sources = list(documents)
    issues: list[FactCheckIssue] = []
    for sentence in _split_sentences(summary):
        overlaps = [_token_overlap(sentence, source.content) for source in sources]
        if not overlaps or max(overlaps) < threshold:
            issues.append(FactCheckIssue(sentence=sentence))
    return FactCheckReport(approved=not issues, issues=issues)
