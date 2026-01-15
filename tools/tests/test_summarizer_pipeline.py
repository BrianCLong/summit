import json
import unittest

from tools.summit_summarizer.fact_check import fact_check_summary
from tools.summit_summarizer.models import Document
from tools.summit_summarizer.pipeline import (
    IterativeSummarizer,
    SummarizationConfig,
    SummarizationPipeline,
)
from tools.summit_summarizer.retrieval import StaticDocumentRetriever


class DummyLLM:
    def __init__(self):
        self.calls = 0

    def complete(
        self, prompt: str, *, system_prompt: str | None = None, temperature: float = 0.2
    ) -> str:
        if "EVALUATOR" in prompt:
            # First evaluation is strict, later approvals are lenient
            approved = self.calls > 0
            self.calls += 1
            return json.dumps(
                {
                    "score": 0.9 if approved else 0.5,
                    "feedback": "Revise" if not approved else "ok",
                    "approved": approved,
                }
            )
        self.calls += 1
        return f"summary draft {self.calls}"


class PipelineTests(unittest.TestCase):
    def setUp(self) -> None:
        self.documents = [
            Document(title="Doc1", url="http://example.com/1", content="Alpha Beta Gamma"),
            Document(title="Doc2", url="http://example.com/2", content="Delta Epsilon Zeta"),
        ]
        self.retriever = StaticDocumentRetriever(self.documents)
        self.config = SummarizationConfig(max_rounds=3, quality_threshold=0.8)

    def test_iterative_summarizer_stops_after_threshold(self) -> None:
        llm = DummyLLM()
        summarizer = IterativeSummarizer(llm, llm, config=self.config)
        result = summarizer.summarize(self.documents[0], query="test query")
        self.assertTrue(result.iterations)
        self.assertLessEqual(len(result.iterations), self.config.max_rounds)
        self.assertIsNotNone(result.evaluation)
        self.assertTrue(result.evaluation.is_passing(self.config.quality_threshold))

    def test_pipeline_merges_and_fact_checks(self) -> None:
        llm = DummyLLM()
        pipeline = SummarizationPipeline(self.retriever, llm, llm, config=self.config)
        output = pipeline.run("test query", max_documents=2)
        self.assertIn("merged_summary", output)
        report = output["fact_check"]
        self.assertTrue(report.approved or report.issues)

    def test_fact_checker_detects_missing_support(self) -> None:
        report = fact_check_summary("Unsupported claim about something else", self.documents)
        self.assertFalse(report.approved)
        self.assertGreater(len(report.issues), 0)


if __name__ == "__main__":
    unittest.main()
