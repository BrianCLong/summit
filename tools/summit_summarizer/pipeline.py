import json
from collections.abc import Iterable
from dataclasses import dataclass

from .fact_check import fact_check_summary
from .llm import LLMClient
from .models import Document, EvaluationResult, FactCheckReport, SummaryIteration, SummaryResult
from .retrieval import DocumentRetriever

SUMMARY_SYSTEM_PROMPT = (
    "You are a meticulous multi-document summarizer who writes concise, factual reports."
)
EVALUATOR_SYSTEM_PROMPT = "You are a rigorous evaluator who only approves summaries that are accurate, faithful, and responsive."


@dataclass
class SummarizationConfig:
    max_rounds: int = 3
    quality_threshold: float = 0.85
    merge_temperature: float = 0.3


def _build_summary_prompt(document: Document, query: str, feedback: str | None) -> str:
    guidance = feedback or "Focus on relevance, coverage, and factuality."
    return (
        "You are the SUMMARIZER. Draft a concise, factual summary for the user query.\n"
        f"User query: {query}\n"
        f"Source title: {document.title}\n"
        f"Source URL: {document.url}\n"
        f"Feedback from evaluator: {guidance}\n"
        "Source content:\n" + document.content
    )


def _build_evaluation_prompt(summary: str, document: Document, query: str) -> str:
    return (
        "You are the EVALUATOR. Score the summary on a 0-1 scale and provide JSON.\n"
        'Required JSON schema: {"score": float 0-1, "feedback": string, "approved": bool}.\n'
        "Only output valid JSON.\n"
        f"User query: {query}\n"
        f"Summary to score: {summary}\n"
        f"Source content: {document.content}\n"
    )


def _parse_evaluation(raw: str) -> EvaluationResult:
    try:
        payload = json.loads(raw)
        return EvaluationResult(
            score=float(payload.get("score", 0.0)),
            feedback=str(payload.get("feedback", "")),
            approved=bool(payload.get("approved", False)),
        )
    except (json.JSONDecodeError, TypeError, ValueError):
        return EvaluationResult(
            score=0.0, feedback=raw.strip() or "Unable to parse evaluation", approved=False
        )


class IterativeSummarizer:
    """Runs the SummIt-style iterative refine/evaluate loop on a single document."""

    def __init__(
        self,
        summarizer_llm: LLMClient,
        evaluator_llm: LLMClient,
        config: SummarizationConfig | None = None,
    ):
        self.summarizer_llm = summarizer_llm
        self.evaluator_llm = evaluator_llm
        self.config = config or SummarizationConfig()

    def summarize(self, document: Document, query: str) -> SummaryResult:
        feedback: str | None = None
        iterations: list[SummaryIteration] = []
        evaluation: EvaluationResult | None = None
        summary_text = ""

        for _ in range(self.config.max_rounds):
            summary_text = self.summarizer_llm.complete(
                _build_summary_prompt(document, query, feedback),
                system_prompt=SUMMARY_SYSTEM_PROMPT,
            ).strip()
            eval_raw = self.evaluator_llm.complete(
                _build_evaluation_prompt(summary_text, document, query),
                system_prompt=EVALUATOR_SYSTEM_PROMPT,
            )
            evaluation = _parse_evaluation(eval_raw)
            iterations.append(
                SummaryIteration(
                    draft=summary_text, feedback=evaluation.feedback, score=evaluation.score
                )
            )
            if evaluation.is_passing(self.config.quality_threshold):
                break
            feedback = evaluation.feedback

        return SummaryResult(
            document=document, summary=summary_text, iterations=iterations, evaluation=evaluation
        )


class SummarizationPipeline:
    """Coordinates retrieval, iterative summarization, synthesis, and fact-checking."""

    def __init__(
        self,
        retriever: DocumentRetriever,
        summarizer_llm: LLMClient,
        evaluator_llm: LLMClient,
        *,
        config: SummarizationConfig | None = None,
    ):
        self.retriever = retriever
        self.summarizer_llm = summarizer_llm
        self.evaluator_llm = evaluator_llm
        self.config = config or SummarizationConfig()
        self.iterative_summarizer = IterativeSummarizer(
            summarizer_llm, evaluator_llm, config=self.config
        )

    def retrieve(self, query: str, *, limit: int = 5) -> list[Document]:
        return self.retriever.retrieve(query, limit=limit)

    def summarize_documents(self, documents: Iterable[Document], query: str) -> list[SummaryResult]:
        return [self.iterative_summarizer.summarize(document, query) for document in documents]

    def merge_summaries(self, summaries: Iterable[SummaryResult], query: str) -> str:
        combined = "\n\n".join(
            f"[{summary.document.title}] {summary.summary}"
            for summary in summaries
            if summary.summary.strip()
        )
        prompt = (
            "You are the MERGER. Combine the following document summaries into a single coherent report.\n"
            "The report must answer the user query directly, highlight points of agreement, and note conflicts.\n"
            f"User query: {query}\n"
            f"Document summaries:\n{combined}\n"
            "Return a concise, well-structured synthesis."
        )
        return self.summarizer_llm.complete(
            prompt, system_prompt=SUMMARY_SYSTEM_PROMPT, temperature=self.config.merge_temperature
        ).strip()

    def fact_check(self, merged_summary: str, documents: Iterable[Document]) -> FactCheckReport:
        return fact_check_summary(merged_summary, documents)

    def run(self, query: str, *, max_documents: int = 5, fact_check_threshold: float = 0.4) -> dict:
        documents = self.retrieve(query, limit=max_documents)
        doc_summaries = self.summarize_documents(documents, query)
        merged_summary = self.merge_summaries(doc_summaries, query)
        fact_check_report = self.fact_check(merged_summary, documents)
        if fact_check_report.issues:
            adjustments = "\n".join(issue.sentence for issue in fact_check_report.issues)
            merged_summary = self.summarizer_llm.complete(
                (
                    "Update the merged summary to resolve fact check concerns.\n"
                    f"Original summary:\n{merged_summary}\n"
                    f"Sentences needing more support:\n{adjustments}\n"
                    "Only output the revised summary."
                ),
                system_prompt=SUMMARY_SYSTEM_PROMPT,
                temperature=0.4,
            ).strip()
            fact_check_report = fact_check_summary(
                merged_summary, documents, threshold=fact_check_threshold
            )

        return {
            "query": query,
            "documents": documents,
            "document_summaries": doc_summaries,
            "merged_summary": merged_summary,
            "fact_check": fact_check_report,
        }
