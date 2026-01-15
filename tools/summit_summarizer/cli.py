import argparse
import json
from pathlib import Path

from .llm import OpenAILLMClient
from .models import Document
from .pipeline import SummarizationConfig, SummarizationPipeline
from .retrieval import (
    DocumentRetriever,
    DuckDuckGoSearchClient,
    HttpContentFetcher,
    StaticDocumentRetriever,
)


def _load_documents(path: Path) -> list[Document]:
    payload = json.loads(path.read_text())
    documents: list[Document] = []
    for item in payload:
        documents.append(
            Document(
                title=item["title"],
                url=item.get("url", ""),
                content=item["content"],
            )
        )
    return documents


def build_pipeline(
    documents_path: Path | None, *, max_rounds: int, quality_threshold: float
) -> SummarizationPipeline:
    config = SummarizationConfig(max_rounds=max_rounds, quality_threshold=quality_threshold)
    summarizer = OpenAILLMClient()
    evaluator = OpenAILLMClient()
    if documents_path:
        retriever: DocumentRetriever = StaticDocumentRetriever(_load_documents(documents_path))
    else:
        retriever = DocumentRetriever(DuckDuckGoSearchClient(), HttpContentFetcher())
    return SummarizationPipeline(retriever, summarizer, evaluator, config=config)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Run the Summit multi-document summarization pipeline"
    )
    parser.add_argument("query", help="User query to drive search and summarization")
    parser.add_argument(
        "--max-documents", type=int, default=5, help="Maximum number of documents to retrieve"
    )
    parser.add_argument(
        "--max-rounds", type=int, default=3, help="Maximum refinement rounds per document"
    )
    parser.add_argument(
        "--quality-threshold",
        type=float,
        default=0.85,
        help="Quality score threshold (0-1) to stop iterating",
    )
    parser.add_argument(
        "--documents-path",
        type=Path,
        help="Optional JSON file with pre-collected documents to avoid live search",
    )
    args = parser.parse_args()

    pipeline = build_pipeline(
        args.documents_path, max_rounds=args.max_rounds, quality_threshold=args.quality_threshold
    )
    result = pipeline.run(args.query, max_documents=args.max_documents)
    print(json.dumps(result, default=lambda o: o.__dict__, indent=2))


if __name__ == "__main__":
    main()
