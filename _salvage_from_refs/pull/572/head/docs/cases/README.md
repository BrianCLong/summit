# Cases

Cases collect related alerts and investigation artifacts.

## Entity Model
- `Case`: id, title, status, priority, severity, assignees, tags.
- `Evidence`: name, mime, sha256, size, addedAt.
- `TimelineEvent`: link alerts, comments, evidence, playbook runs.

## Evidence
Uploaded files are hashed with SHA-256 and stored with MIME allowlist.
Chain-of-custody entries record who added evidence and when.

## Exports
Cases can be exported to sanitized JSON or PDF.
Exports include a manifest of evidence hashes.
