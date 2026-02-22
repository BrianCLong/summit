# FS-Researcher Security & Data Handling

This document details the security posture for the FS-Researcher implementation in Summit.

## 1. Prompt Injection Defense
- **Stage 1 (Context Builder)**: All retrieved web content is scanned for common injection patterns (e.g., "ignore previous instructions"). Content failing this check is flagged as unsafe.
- **Stage 2 (Report Writer)**: Operates in a closed-loop using only the Knowledge Base. Browsing tools are strictly disabled to prevent late-stage injection or exfiltration.

## 2. PII & Sensitive Data Handling
- **Redaction**: All archived source content and KB notes are processed through the `PIIRedactor` to mask emails, phone numbers, and other identifiers.
- **Retention**: Workspaces are persistent on disk but should follow repository-level retention policies.

## 3. Workspace Integrity
- **Deterministic Hashing**: `stamp.json` provides a cryptographic signature of the research state, ensuring that any unauthorized tampering with control files or KB notes can be detected.
- **Atomic Writes**: Implementation uses atomic file operations to prevent workspace corruption during failures.
