### Context

Source: `docs/project_management/core-ga-cutover-advisory-report.md`
Excerpt/why: Starkey flags elevated risk from data poisoning and prompt-injection/model abuse; requires telemetry sanity and guardrails to be first-class gates. Adversaries will try prompt-injection on NL-to-Cypher.

### Problem / Goal

The orchestrator, particularly components interacting with Large Language Models (LLMs) or processing natural language inputs, is vulnerable to prompt injection and data poisoning attacks. These attacks can manipulate model behavior, extract sensitive information, or introduce malicious code. The goal is to implement robust guardrails and detection mechanisms to prevent and mitigate prompt injection and data poisoning.

### Proposed Approach

- Implement input validation and sanitization for all user-provided prompts and data fed to LLMs.
- Utilize techniques like prompt templating and strict schema enforcement to limit the attack surface.
- Develop and integrate prompt-injection detection models or heuristics (e.g., looking for adversarial phrases, role-playing instructions).
- Implement output filtering and validation for LLM responses to prevent unintended code execution or sensitive data leakage.
- For NL-to-Cypher translation, implement strict validation of the generated Cypher queries against a predefined safe subset of operations.
- Integrate telemetry sanity checks to detect anomalous model behavior indicative of abuse.

### Tasks

- [ ] Research and select appropriate prompt injection detection techniques and libraries.
- [ ] Implement input sanitization and validation for all LLM inputs.
- [ ] Develop and integrate prompt-injection detection logic.
- [ ] Implement output filtering and validation for LLM responses.
- [ ] For NL-to-Cypher, implement a Cypher query validator.
- [ ] Integrate telemetry sanity checks for model abuse detection.
- [ ] Add security tests specifically targeting prompt injection and data poisoning.

### Acceptance Criteria

- Given an adversarial prompt, the system successfully detects and blocks the injection attempt.
- Generated Cypher queries are always within the safe subset of operations.
- Telemetry detects and alerts on anomalous model behavior indicative of abuse.
- Metrics/SLO: Prompt injection detection rate > 95%; false positive rate < 1%.
- Tests: Dedicated security tests for prompt injection, data poisoning, and model abuse.
- Observability: Alerts for detected prompt injection attempts; logs include details of blocked prompts.

### Safety & Policy

- Action class: READ (but can lead to WRITE/DEPLOY if exploited)
- OPA rule(s) evaluated: Policies related to data handling and model interaction.

### Dependencies

- Depends on: #<id_of_observability_issue>
- Blocks: High-autonomy LLM interactions.

### DOR / DOD

- DOR: Prompt injection mitigation strategy and detection models approved.
- DOD: Merged, security tests passing, monitoring and alerting in place.

### Links

- Code: `<path/to/llm/guardrails>`
- Docs: `<link/to/security/guidelines>`
