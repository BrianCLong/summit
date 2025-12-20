"""Summit multi-document iterative summarization utilities."""

from .models import Document, EvaluationResult, FactCheckIssue, FactCheckReport, SummaryIteration, SummaryResult
from .fact_check import fact_check_summary
from .pipeline import IterativeSummarizer, SummarizationPipeline
from .retrieval import DocumentRetriever, DuckDuckGoSearchClient, HttpContentFetcher, StaticDocumentRetriever
from .llm import LLMClient, OpenAILLMClient

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
