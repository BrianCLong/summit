Owner: Governance
Last-Reviewed: 2026-01-14
Evidence-IDs: none
Status: active

# Epic 7: AI Observability & Cost Controls (LLMs can torch margin)

1.  Instrument cost per AI action (tokens, calls, retrieval, tools) by tenant.
2.  Implement budgets and quotas per plan/tenant with graceful degradation.
3.  Add caching and reuse strategies for repeated prompts and retrieval.
4.  Implement model routing: cheap model for low risk, premium for high value.
5.  Create prompt templates and guardrails to reduce token bloat.
6.  Monitor latency and failure rates; implement retries carefully.
7.  Track conversion and retention impact of AI features (prove ROI).
8.  Add abuse controls: scraping, prompt flooding, automated misuse.
9.  Run monthly AI FinOps review: cost drivers, savings shipped, next targets.
10. Provide customer usage dashboards and alerts where relevant.
11. Delete uncontrolled “always-on GPT-4 tier” usage without ROI proof.
