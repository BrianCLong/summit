# agentic-rag

This service implements the **Agentic RAG (Retrieval Augmented Generation) with Guarded Re-rank** pipeline.

It provides a new `/agentic/rag` endpoint that orchestrates the following steps:
1.  **Retrieval**: Fetches relevant documents or data.
2.  **LLM Re-rank**: Utilizes an LLM to re-rank retrieved documents for improved relevance.
3.  **Policy-checked Tool Plan**: Generates a tool execution plan that passes policy simulation and checks.
4.  **Execution**: Executes the planned tools.
5.  **Grounding Attestation**: Embeds provenance hashes and grounding attestations into the evidence bundle for all outputs.

This service goes beyond baseline RAG by enforcing policy and provenance at each hop of the retrieval and generation process.
