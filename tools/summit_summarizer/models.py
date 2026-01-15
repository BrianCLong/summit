from dataclasses import dataclass, field


@dataclass
class Document:
    """Lightweight representation of a retrieved document."""

    title: str
    url: str
    content: str


@dataclass
class SummaryIteration:
    """Information about a single summarization iteration."""

    draft: str
    feedback: str | None
    score: float | None


@dataclass
class EvaluationResult:
    """Evaluator outcome for a draft summary."""

    score: float
    feedback: str
    approved: bool

    def is_passing(self, threshold: float) -> bool:
        return self.approved or self.score >= threshold


@dataclass
class SummaryResult:
    """End-to-end result for a single document."""

    document: Document
    summary: str
    iterations: list[SummaryIteration] = field(default_factory=list)
    evaluation: EvaluationResult | None = None


@dataclass
class FactCheckIssue:
    """Represents a potential factual gap or concern."""

    sentence: str
    evidence: str | None = None


@dataclass
class FactCheckReport:
    """Report from running the fact-checker against a summary."""

    approved: bool
    issues: list[FactCheckIssue] = field(default_factory=list)

    def raise_for_rejection(self) -> None:
        if not self.approved:
            missing = ", ".join(issue.sentence for issue in self.issues)
            raise ValueError(f"Summary failed fact check: {missing}")
