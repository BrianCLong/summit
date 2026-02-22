# Data Handling: Regulatory Automation

## Classification
*   **Public**: All regulatory source documents and generated metadata.
*   **Internal**: Mapping logic (ClaimMap) is Internal but not Sensitive.

## Never-Log
*   Do not log raw source content if it contains unparsed binary data.
*   Do not log internal auth tokens used for GitHub Issue updates.

## Retention
*   Artifacts are committed to the repo.
*   `stamp.json` provides provenance.
