# Data Handling: Living Architecture Flows

## Classification

Generated flow artifacts are classified as **Internal**.

## Never log list

- Raw file contents from workspace scans.
- Environment variables and credentials.
- OpenAPI example payloads containing potential secrets.
- Authorization headers and user tokens.

## Retention

- Keep `flows.json` and Mermaid flow diagrams versioned in-repo.
- Keep run logs ephemeral in CI artifacts with a 7-30 day policy.
- Keep context pack `.summit/context/flows.pack.json` as regenerable output.
