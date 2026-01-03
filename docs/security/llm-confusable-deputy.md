# LLM Confusable-Deputy Defense Pack

This document describes the defenses implemented to reduce the impact of prompt-injection, RSA-style pretexting, and unsafe tool execution within Summit's LLM stack. The controls align with OWASP LLM01 (Prompt Injection) guidance and emphasize least privilege and impact reduction.

## Threat Model and Residual Risk

- **Threats**: attackers issue prompt injections that override instructions, request sensitive actions (credential access, execution, exfiltration), or use role-play/scenario framing to coerce the model. Retrieval sources can also contain embedded instructions.
- **Goals**: prevent coercion into harmful instructions or unsafe tool usage; block or quarantine malicious retrieval input; avoid downstream execution of model output.
- **Residual risk**: pattern-based detection can miss novel obfuscation; human review is still required for high-risk flows. Metrics/logs are emitted for monitoring.

## Controls Delivered

1. **Prompt firewall**
   - Risk scoring of user prompts and retrieved chunks with rule matches for overrides, excessive agency, and RSA-style pretexting.
   - Actions: `allow`, `allow_with_strict_mode`, `require_step_up`, `block`.
   - Structured audit log fields: `tenant_id`, `user_id`, `route`, `risk_score`, `matched_rules`, `action`, `tool_requested`, `tool_allowed`.
   - Metrics: `prompt_firewall_block_total`, `prompt_firewall_strict_mode_total`, `prompt_firewall_step_up_total`.
2. **Tool permissions and step-up gating**
   - Allowlist with JSON schema validation, required roles/routes, privilege level, and optional step-up.
   - Strict mode disables high-risk tools; step-up is required for sensitive tools by default.
3. **Safe output handling**
   - Model output is HTML-escaped and secret-redacted before returning to callers; nothing is auto-executed.
4. **RAG safeguards**
   - Retrieved chunks are wrapped in an `UNTRUSTED_CONTEXT` envelope and re-classified; risky chunks are quarantined but retain provenance metadata.

## Configuration

The LLM router configuration (`server/src/llm/config.ts`) now includes security defaults:

- `security.firewall`: thresholds for strict, step-up, and block actions (defaults 40/65/80).
- `security.tools`: enable/disable and supply the tool permission allowlist. Default policies cover `safe_retrieval`, `summarize_text`, `write_audit_note` (step-up), and `network_request` (denied unless explicitly enabled).

## Adding Tools Safely

- Define a tool in the allowlist with a strict JSON schema, `minPrivilege`, and explicit `allowedRoutes` and `allowedRoles`.
- Mark `stepUpRequired: true` for any network, credential, or write-capable tool.
- Rely on the guardrail to drop non-allowlisted tools and to require re-authentication before sensitive operations.

## Operations and Observability

- Monitor the counters listed above and the structured log events for blocked or strict-mode sessions.
- Quarantined retrieval chunks surface `finding` metadata so downstream consumers can decide to omit them entirely.

## References

- OWASP GenAI Security Project — LLM01 Prompt Injection.
- CyberSecurityNews summary (Threat Actors Manipulating LLMs for Automated Vulnerability Exploitation, Dec 31 2025).
- "From Rookie to Expert: Manipulating LLMs" (arXiv:2512.22753).
