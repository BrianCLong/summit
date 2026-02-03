# Disinfo News Ecosystem 2026 Standards

## Import/Export matrix

| Interface                            | Import                                                    | Export                                  | Non-goals                                |
| ------------------------------------ | --------------------------------------------------------- | --------------------------------------- | ---------------------------------------- |
| URL/HTML/Text bundles                | `sample_bundle.json` (URL + extracted text + source meta) | normalized `claims.json`                | No scraping circumvention                |
| Media references (image/video/audio) | file paths + optional metadata                            | provenance summary                      | No deepfake generation                   |
| Summit graph (Neo4j/GraphRAG)        | optional entity edges                                     | “exposure graph” + coordination signals | No automatic attribution to real persons |
| Compliance                           | DSA-style checklist inputs                                | transparency export JSON                | No legal advice                          |

## Threat-informed requirements

### Threat → mitigation → gate → test case

1. **Prompt-injection / malicious HTML** → sanitize inputs; treat all external text as untrusted → CI runs sanitizer unit tests → fixture: HTML with script tags & prompt-injection strings.
2. **PII leakage in logs** → redact emails/phones/addresses; never-log list → CI “no-PII-in-logs” test → fixture includes PII-like strings.
3. **Defamation/unsafe labeling** → outputs use probabilistic language + evidence pointers; feature-flagged UI → snapshot tests confirm required disclaimers.
4. **Coordinated harassment enablement** → deny-by-default: no “who to harass” outputs; only defensive mitigation suggestions → policy regression tests on playbook generator.
5. **Model drift** → scheduled drift detector compares metrics distributions → nightly job + alert thresholds.

## Performance & cost budgets

* **Latency budget (local analysis, no external LLM calls):** ≤ 3s for `sample_bundle.json` fixture on CI runner.
* **Memory:** ≤ 512MB for fixture suite.
* **Cost-per-run:** $0 (offline). Any future online enrichment must be optional + rate-limited.
