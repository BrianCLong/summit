# Narrative Dominance Suite (NDS) Data Handling

## Data classes
- **Public OSINT content**: store as hashed references where possible; avoid raw text in logs.
- **Derived narrative clusters**: medium sensitivity (may reveal investigative intent).
- **Policies and decisions**: high sensitivity (compliance posture).

## Never-log rules
- Raw OSINT text bodies.
- Inferred protected-class attributes.
- Credentials, tokens, or secrets.
- User-entered campaign drafts.

## Retention
- Follow Summit configurable retention and legal hold expectations for audit events.
- Evidence artifacts must be deterministic and reproducible from canonical inputs.

## Access control
- Enforce purpose, retention, and jurisdiction tags on reads and writes.
- Deny cross-tenant access by default.

## Auditability
- All policy decisions produce a Policy Decision Record (PDR).
- All NDS runs write append-only audit events with hash chaining.

## Sanitization
- Treat OSINT text as untrusted input.
- Normalize and hash references; store redacted previews only if explicitly approved.
