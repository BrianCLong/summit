# Agent Trace

Agent Trace is an open specification for tracking AI-generated code. Summit implements this specification to provide auditable attribution of AI contributions.

## How it works

Trace records are stored in the repository under `.summit/agent-trace/records/<revision>/<trace_id>.json`.

Each record contains:
- **Version**: The spec version (v0.1.0).
- **ID**: A unique UUID for the trace.
- **Timestamp**: When the code was generated.
- **VCS**: The commit or revision the trace applies to.
- **Files**: A list of files and the line ranges attributed to AI or humans.

## CI Enforcement

The CI gate `ci/gates/agent_trace_required.sh` ensures that:
1. AI-assisted changes have associated trace records.
2. Every changed file is referenced in at least one trace.
3. URLs to conversations are redacted for privacy.

## Privacy

Conversation URLs are automatically redacted to remove query parameters and fragments. Summit also enforces a domain allowlist for these URLs.

## Tools

The `@intelgraph/agent-trace` package provides a CLI for managing traces:

```bash
# Validate a trace record
pnpm agent-trace:validate <path>

# Summarize traces for a revision
pnpm agent-trace:summarize <revision>
```
