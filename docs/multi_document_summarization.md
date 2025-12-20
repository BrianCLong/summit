# Multi-Document Summarization Pipeline

This document outlines the automated, SummIt-inspired pipeline added for orchestrating web retrieval, iterative summarization, synthesis, and lightweight fact checking. The flow is implemented in `tools/summit_summarizer` and is designed to be modular so different search providers or LLM backends can be swapped in without changing the orchestration logic.

## Capabilities

- **Document retrieval** via a pluggable search client (DuckDuckGo HTML scraper by default) and a simple HTTP content fetcher.
- **Iterative refine-and-evaluate loop** that mirrors the SummIt pattern: a summarizer drafts, an evaluator scores/feeds back, and the process stops once a quality bar is reached.
- **Multi-document synthesis** that merges per-document summaries into a single answer focused on the user query.
- **Lightweight fact checking** that flags unsupported sentences before a heavier QA step.
- **CLI entrypoint** for ad-hoc usage, including an air-gapped mode that reads pre-collected documents from JSON.

## Running the pipeline

1. Ensure Python 3.11+ is available and the `openai` package is installed if you plan to call the hosted models.
2. Export your API key: `export OPENAI_API_KEY=...`.
3. Run the CLI with a query:

```bash
python -m tools.summit_summarizer.cli "What are the latest advances in autonomous summarization?"
```

Use `--documents-path path/to/docs.json` to bypass live search (the JSON should contain a list of `{ "title": ..., "url": ..., "content": ... }` objects).

## Key modules

- `tools/summit_summarizer/retrieval.py` — search + fetch utilities with `DocumentRetriever` and `StaticDocumentRetriever` for offline inputs.
- `tools/summit_summarizer/pipeline.py` — iterative summarizer, merger, and fact-check orchestration.
- `tools/summit_summarizer/fact_check.py` — lexical overlap fact checker to highlight unsupported claims.
- `tools/summit_summarizer/cli.py` — command-line entry for end-to-end runs.

## Extending

- Swap the search provider by implementing the `SearchClient` protocol and wiring it into `DocumentRetriever`.
- Replace the LLM backend by implementing `LLMClient`. For example, you can inject a hosted model, a local model, or a mock for offline testing.
- Adjust quality thresholds or iteration counts through `SummarizationConfig` when building the pipeline.
