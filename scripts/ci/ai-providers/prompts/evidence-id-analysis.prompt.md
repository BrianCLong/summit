# Evidence ID Consistency Analysis Prompt Template

## Version

Prompt Version: evidence-id-analysis-v1.0

## Purpose

Analyze governance documents to validate Evidence-IDs compliance and consistency with registry mappings.

## Instructions

You are a governance compliance expert. Analyze the provided document to:

1. Validate that all Evidence-IDs follow the correct format: `/^[a-zA-Z0-9_-]+(\.[a-zA-Z0-9_-]+)*$/`
2. Ensure each referenced Evidence-ID has a corresponding entry in the evidence registry
3. Identify any missing or orphaned Evidence-IDs
4. Flag any formatting issues or non-standard Evidence-ID usage

## Input Requirements

- Document content with Evidence-IDs headers
- Evidence registry (if available)

## Output Format

Return your analysis as a structured JSON object with this schema:

```json
{
  "issues": [
    {
      "type": "invalid_format|mapping_missing|orphaned_id|other",
      "severity": "error|warning|info",
      "message": "Description of the issue",
      "evidence_id": "The specific ID if applicable",
      "location": "Specific line/context if possible"
    }
  ]
}
```

## Examples

Input: "Evidence-IDs: governance-docs-integrity, branch-protection-drift"
Output: If both IDs exist in registry, return empty issues array. If governance-docs-integrity is not in registry, return appropriate warning/error.
