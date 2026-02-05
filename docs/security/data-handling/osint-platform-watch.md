# OSINT Platform Watch Data Handling

## Classification
- Public web content and user-provided summaries.

## Retention
- Artifacts retained 30–90 days. Configure via pipeline settings.

## Never-Log
- Authorization headers, cookies, query params, session identifiers, or credentials.

## Redaction
- Emails, tokens, session IDs, and long hex strings are redacted.
- URLs are stored without query params and fragments.

## Sanitization
- HTML is stripped before Markdown rendering.
- Angle brackets are escaped in Markdown output.

## Access
- Read-only access for analytics; write access restricted to pipeline execution.
