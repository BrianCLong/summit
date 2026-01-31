# Flattening Structured Data for Vector Search

## Why Flatten?
Embedding models are primarily trained on natural language. Raw JSON punctuation and key-value syntax introduce noise that can distort the semantic representation in vector space. By flattening structured data into readable, context-rich natural language, we can improve retrieval performance (Recall and MRR).

## Technique
The `StructuredFlattener` converts nested objects into strings like:
`"Product. sku: 123. category: electronics. price: 299 USD."`

## Policy Configuration
Flattening is **OFF by default**. Use `FlatteningPolicy` to enable and configure:
- `allowlist`/`denylist`: Control which keys are included.
- `never_embed`: Hardcoded sensitive keys that are always excluded.
- `max_depth`: Prevent excessive recursion.
- `max_list_items`: Truncate long arrays.

## PII Redaction
The pipeline includes a PII redaction stage that runs before or during flattening to ensure sensitive data (emails, SSNs, etc.) never reaches the vector store.

## Evaluation
Run the evaluation harness to compare performance on your dataset:
```bash
python3 summit/evals/retriever/runner.py
```
Outputs Recall@10, Precision@10, and MRR.
