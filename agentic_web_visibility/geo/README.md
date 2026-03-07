# Generative Engine Optimization (GEO) Measurement

This module implements deterministic AI answer visibility measurement, effectively acting as an open, rigorous AI answer measurement engine for Summit.

## Core Capabilities
- **Deterministic Prompt Sampling:** Uses defined intents, categories, and modifiers.
- **Three-Layer Scoring:** Separates measurement into Eligibility, Selection, and Attribution.
- **Upstream Prior Correction:** Adjusts for visibility inherited from traditional search index prominence.
- **Counterfactual Lab:** Measures exact visibility delta when content features (e.g. quotes, statistics) change.

## Architecture
- `src/prompt_sampler.ts`: Generates deterministic prompt distribution.
- `src/runner_registry.ts`: Abstraction for querying AI models (OpenAI, Anthropic, Gemini, etc.).
- `src/parsers/`: Entity and citation extraction layer.
- `src/scoring/`: Separate algorithms for eligibility, selection, attribution, and upstream prior.
- `src/reporting/`: Generates `report.json`, `metrics.json`, and `stamp.json`.

## Documentation
- Standards: `docs/standards/geo-answer-visibility.md`
- Security/Data Handling: `docs/security/data-handling/geo-answer-visibility.md`
- Ops Runbooks: `docs/ops/runbooks/geo-answer-visibility.md`
