# DeR2 Sandbox Data Handling & Threat Controls

## MAESTRO Security Alignment

- **MAESTRO Layers**: Data, Agents, Tools, Observability, Security.
- **Threats Considered**: prompt injection, parametric leakage, non-determinism, data exfiltration via logs.
- **Mitigations**: directive stripping, leakage validation gates, deterministic RNG, strict redaction + hash-only logging.

## Threat-Informed Requirements

| Threat | Mitigation | CI/runtime gate | Test case |
| --- | --- | --- | --- |
| Prompt injection inside documents | Strip/escape tool directives; documents are data policy | `DER2_NO_TOOLS_FROM_DOCS=1` enforced | Fixture doc containing “run tool()” must not trigger tool |
| Parametric leakage / memorization claims | Require instruction-only failure for “novelty-required” tasks in validation mode | CI job `der2_leakage_gate` | Known-answer task must fail in instruction-only for novelty-required label |
| Non-determinism via random distractors | Deterministic RNG seed from `bench_id` + instance id | `--deterministic` default ON | Snapshot test of chosen distractor IDs |
| Data exfiltration via logs | Never log raw docs; log hashes + evidence IDs only | `DER2_NEVER_LOG_DOC_TEXT=1` enforced | Unit test ensures logger redacts content |

## Data Classification

- **Public corpora**: Approved public datasets or licensed corpora.
- **Restricted corpora**: BYO libraries, stored locally and never logged.

## Retention & Redaction

- Retain only hashes, evidence IDs, and extracted citations in artifacts.
- Never log full document text, API keys, user prompts containing secrets, or chain-of-thought.

## Abuse-case Fixtures

- `tests/fixtures/der2/injection_doc.txt`
- `tests/fixtures/der2/pii_like_doc.txt`
