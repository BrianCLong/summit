# Data Handling: Scikit-Learn Fusion Pipeline

## Threat-Informed Requirements

| Threat | Mitigation | Gate | Test |
| ------ | ---------- | ---- | ---- |
| **T1: Data Leakage (Train/Test Contamination)** | Enforce split-before-fit. Forbid fitting transformers on test. | Leakage tests in pytest | `test_no_leakage_split_before_fit.py` validates that contrived tokens present only in test set do not appear in the vocabulary of the TF-IDF vectorizer. |
| **T2: Network Exfiltration / Non-determinism via Model Download** | SentenceTransformer backend must be explicit. CI uses dummy backend. | Fail if backend tries to use sentence-transformers without `--allow-network` flag | `EmbeddingTransformer` initialization checks `SUMMIT_FUSION_ALLOW_NETWORK`. Defaults to 0/False. |
| **T3: PII Persistence in Artifacts** | Never log raw text. Store only hashes and aggregate metrics. | Automated scanning of artifacts | `test_cli_and_artifacts.py` asserts `report.json` does not contain any raw text content. |

## Compliance Rules
- Data logs must auto-expire after 30 days.
- Full prompts must never be logged (hash inputs only).
- The fallback `DummyEmbeddingTransformer` MUST be deterministic given an input string to prevent test flakiness in CI.
