# Framework Risk Data Handling Policy

## Core Directives
When executing framework risk evaluations:

1. **No Outbound Traffic**: The evaluation engine MUST NOT make outbound HTTP/network calls. All risk scoring must be based on static, internal heuristics and detected dependencies.
2. **Never Log Rule**: The following items are strictly prohibited from being logged or written to evidence artifacts:
   - Repository URLs
   - Authentication tokens, API keys, or credentials
   - Internal branch names or author names
   - Any proprietary or PII data
3. **Public Metadata Only**: Only publicly available metadata (e.g., framework version, package name) may be used as input for heuristic evaluation.

Violation of these directives will cause CI failure and immediate quarantine of generated evidence.
