"""Summit multi-document iterative summarization utilities."""

from .fact_check import fact_check_summary
from .llm import LLMClient, OpenAILLMClient
from .models import (
    Document,
    EvaluationResult,
    FactCheckIssue,
    FactCheckReport,
    SummaryIteration,
    SummaryResult,
)
from .pipeline import IterativeSummarizer, SummarizationPipeline
from .retrieval import (
    DocumentRetriever,
    DuckDuckGoSearchClient,
    HttpContentFetcher,
    StaticDocumentRetriever,
)

__all__ = [
    "Document",
    "DocumentRetriever",
    "DuckDuckGoSearchClient",
    "EvaluationResult",
    "FactCheckIssue",
    "FactCheckReport",
    "HttpContentFetcher",
    "IterativeSummarizer",
    "LLMClient",
    "OpenAILLMClient",
    "StaticDocumentRetriever",
    "SummarizationPipeline",
    "SummaryIteration",
    "SummaryResult",
    "fact_check_summary",
]
