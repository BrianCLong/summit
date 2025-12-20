# Summit MDS: Automated Iterative Multi-Document Summarization

A Python tool that automates the Summit iterative summarization process for a given query. It retrieves relevant documents, iteratively refines summaries using an LLM (Summarizer vs. Evaluator loop), and synthesizes a final fact-checked report.

## Features

- **Automated Retrieval**: Uses DuckDuckGo to find relevant articles.
- **Iterative Refinement**: Implements the SummIt loop where a summarizer generates a draft and an evaluator critiques it until quality is met.
- **Multi-Document Synthesis**: Merges insights from multiple sources into a coherent report.
- **Fact-Checking**: verifying the final output against source texts.

## Installation

1.  Navigate to the directory:
    ```bash
    cd tools/summit-mds
    ```

2.  Install dependencies:
    ```bash
    pip install -r requirements.txt
    ```

3.  Set up your OpenAI API key:
    ```bash
    export OPENAI_API_KEY="your-api-key"
    ```

## Usage

Run the script with a query:

```bash
python summit.py "Impact of AI on healthcare"
```

### Options

-   `--model`: Specify the LLM model (default: `gpt-4o`).
-   `--iterations`: Set maximum refinement iterations (default: 3).
-   `--mock`: Run in mock mode (simulates API calls for testing).

Example:

```bash
python summit.py "Quantum Computing advancements" --iterations 5 --model gpt-3.5-turbo
```

## Architecture

1.  **Search**: Retrieves top 5 URLs matching the query.
2.  **Extract**: Scrapes text content from each URL.
3.  **Iterative Summarization (Per Document)**:
    -   **Draft**: Generates initial summary.
    -   **Critique**: Evaluates accuracy and completeness.
    -   **Refine**: Updates summary based on critique.
4.  **Merge**: Combines all refined summaries.
5.  **Fact Check**: Verifies the final report against source contexts.
