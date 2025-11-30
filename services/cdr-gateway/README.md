# Content Disarm & Reconstruction Gateway (Prompt #69)

- **Feature flag:** `CDR_ENABLED` (default: false)
- **Scope:** sanitize uploads (PDF flatten, macro strip, image re-encode, archive safe-list); manifest of removed/normalized parts
- **Events:** `cdr.cleaned|cdr.blocked`; originals preserved; sanitized copies forward only
- **Policy:** default=standard; v1 types: PDF, DOCX, XLSX, PPTX, PNG, JPEG, ZIP/TAR (safe-listed contents)
- **Tests:** malicious corpus fixtures; false-negative bounds; throughput baselines; Playwright upload→sanitize→inspect
