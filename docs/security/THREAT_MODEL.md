# Threat Model

**Version**: 1.0 (External)
**Status**: Live
**Date**: 2025-10-28
**Custodian**: Security Engineering

## 1. Introduction

This document outlines the threat model for the Summit platform, tailored for external security reviewers. It identifies key assets, realistic threat actors, and the primary attack surfaces of the system. It then summarizes the highest-priority threats and the mitigations in place to address them.

For a detailed overview of our security architecture, please see [`SECURITY_ARCHITECTURE.md`](./SECURITY_ARCHITECTURE.md).

## 2. Assets & Threat Actors

| Key Assets | Primary Threat Actors |
| :--- | :--- |
| **Customer Data**: Sensitive information and knowledge graphs provided by our customers. | **Malicious External User**: An authenticated user attempting to access data beyond their authorized scope. |
| **System Integrity**: The correctness and availability of our platform and its outputs. | **Compromised Dependency**: A third-party library (e.g., an npm package) with a hidden vulnerability. |
| **Proprietary IP**: Our internal algorithms, models, and system prompts. | **Misconfigured Agent**: An autonomous agent that, due to misconfiguration, exceeds its intended operational boundaries. |
| **Compute Resources**: Cloud infrastructure and API quotas for services like LLMs. | **Insider Threat**: A malicious or negligent internal user with privileged access. |

## 3. High-Priority Threats & Mitigations

This section describes the most significant threats to the Summit platform and the primary controls in place to mitigate them.

| Threat ID | Threat Description | Threat Scenario | Mitigation(s) |
| :--- | :--- | :--- | :--- |
| **T-01** | **Tenant Data Exposure** | A malicious user exploits a flaw in an API endpoint to access or modify data belonging to another tenant. | - **Strict Tenant Isolation**: Enforced at the API, application, and database layers (via RLS).<br>- **Mandatory AuthZ Checks**: All data-accessing calls are routed through a central authorization service (OPA).<br>- **Continuous Testing**: We run a dedicated suite of tests to continuously verify tenant isolation. |
| **T-02** | **Prompt Injection** | An attacker injects malicious instructions into a user-facing input (like a search query) to manipulate a downstream LLM into revealing sensitive data or executing unintended actions. | - **Input Sanitization**: All inputs are sanitized to remove control characters and prompt delimiters.<br>- **System/User Role Separation**: Prompts are structured to clearly separate trusted system instructions from untrusted user input.<br>- **LLM Output Filtering**: Output from the LLM is scanned for sensitive patterns before being returned to the user. |
| **T-03** | **Denial of Service (DoS)** | A user consumes excessive resources (API calls, compute, LLM tokens) to degrade performance or cause an outage for other users. | - **Rate Limiting**: The API gateway enforces strict per-user and per-tenant rate limits.<br>- **Resource Quotas**: A central budget service tracks and enforces limits on resource-intensive operations (e.g., agent runs, large queries). |
| **T-04** | **Supply Chain Compromise** | A vulnerability in a third-party dependency is exploited to gain unauthorized access to the system. | - **Dependency Scanning**: Automated scanning of all dependencies for known vulnerabilities in CI.<br>- **SBOM Generation**: A Software Bill of Materials is generated for every release.<br>- **Principle of Least Privilege**: Services run with minimal permissions to limit the impact of a compromise. |
| **T-05** | **Sensitive Information Leakage** | Confidential information (e.g., API keys, PII) is inadvertently exposed in logs, error messages, or public code repositories. | - **Log Redaction**: Automated redaction of sensitive fields in all application logs.<br>- **Secret Scanning**: Pre-commit and CI hooks scan for hardcoded secrets.<br>- **Generic Error Messages**: Production error messages are sanitized to avoid revealing internal system details. |

## 4. Residual Risk

While these controls significantly reduce risk, a degree of residual risk is unavoidable. This is managed through our ongoing security program, which includes regular penetration testing, security awareness training, and a formalized incident response process. For more details on how we manage risk, please see our [`RISK_REGISTER.md`](./RISK_REGISTER.md).
