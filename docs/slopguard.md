# SlopGuard: AI Slop Governance

SlopGuard is a governance subsystem designed to detect and mitigate "AI slop" (low-quality AI-generated content) across Summit's pipelines.

## Objectives
- **Resist Slop Floods**: Prevent low-effort AI-generated content from overwhelming review processes.
- **Maintain Credibility**: Ensure research artifacts and agent outputs meet quality standards.
- **Dataset Hygiene**: Protect training data from pollution by low-quality AI outputs.

## Policy
SlopGuard operates on a **deny-by-default** principle for high-risk artifacts.

### Mandatory Disclosures
Artifacts classified as "research-like" must include the following metadata:
- `llm_assisted`: Boolean indicating if an LLM was used.
- `llm_tools`: List of LLM tools used.
- `human_verifier`: Role or identifier of the human who verified the content.

### Scoring Heuristics
- **Repetition**: Detects high frequency of repeated words or phrases.
- **Boilerplate**: Identifies common "AI-isms" (e.g., "As an AI language model", "In conclusion").
- **Citation Sanity**: Detects placeholder-like DOIs and URLs (e.g., `10.1234/example-paper`, `your-link-here`).

## Usage

### CLI
The SlopGuard CLI evaluates artifacts and generates evidence.

```bash
pnpm slopguard <path-to-artifact.json>
```

Alternatively, call the Python script directly:
```bash
python3 summit/slopguard/cli.py --artifact <path-to-artifact.json>
```

To apply a manual override:
```bash
python3 summit/slopguard/cli.py --artifact <path-to-artifact.json> --override-reason "Valid template" --approver "admin"
```

### CI Enforcement
By default, the CLI exits with code 1 on a deny decision. This can be toggled via the `SLOPGUARD_ENFORCING` environment variable.

## Configuration
Policy thresholds and feature flags are managed in `config/slopguard.policy.json`.

```json
{
  "deny_threshold": 0.70,
  "require_disclosure_fields": ["llm_assisted", "llm_tools", "human_verifier"],
  "feature_flags": {
    "advanced_cluster_detection": false,
    "dataset_pollution_firewall": false
  }
}
```

## Evidence
SlopGuard produces deterministic evidence artifacts in `evidence/slopguard/`:
- `policy/report.json`: Policy evaluation results.
- `detect/metrics.json`: Detailed scoring metrics.
- `citations/report.json`: Citation verification report.
- `dataset/metrics.json`: Dataset hygiene results.
- `audit/report.json`: Override audit logs.
