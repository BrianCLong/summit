Owner: Governance
Last-Reviewed: 2026-01-14
Evidence-IDs: none
Status: active

# Epic 5: Security for AI Systems (LLMs are new attack surfaces)

1.  Threat model AI features: prompt injection, data exfiltration, tool abuse, jailbreaks.
2.  Implement prompt injection defenses: sanitization, tool permissioning, context isolation.
3.  Restrict tool execution with allowlists and policy checks (least privilege).
4.  Implement output filtering for sensitive data leakage.
5.  Secure RAG: access controls on retrieval corpora, tenant isolation, logging.
6.  Add rate limiting and abuse detection for AI endpoints.
7.  Keep model provider keys in secure vaults; rotate regularly.
8.  Implement monitoring for unusual prompt patterns and high-risk outputs.
9.  Run security red-team for AI flows quarterly; ship fixes.
10. Add incident response runbooks for AI-specific events.
11. Delete “AI debug logging” that stores sensitive prompts indefinitely.
