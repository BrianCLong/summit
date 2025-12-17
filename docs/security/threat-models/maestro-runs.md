# Threat Model: Maestro AI Orchestration (Runs)

> **Owner**: AI Platform Team
> **Last Updated**: 2025-12-06
> **Risk Tier**: Critical
> **Status**: Approved

## 1. Feature Overview

**Description**: Maestro is the AI orchestration layer that manages LLM-powered analysis, autonomous agent execution, MCP (Model Context Protocol) tool invocation, pipeline execution, and provenance tracking for all AI-assisted operations.

**Scope**:
- LLM prompt execution and response handling
- Autonomous agent task orchestration
- MCP server and tool management
- Pipeline definition and execution
- Cost metering and budget enforcement
- Provenance and audit trails (Merkle ledger)
- GraphRAG integration for context retrieval

**Out of Scope**:
- Model training (external service)
- Base authentication (see auth.md)
- Raw data ingestion (separate model)

**Related Components**:
- `server/src/maestro/*` - Core orchestration
- `server/src/maestro/mcp/*` - MCP server management
- `server/src/maestro/runs/*` - Run execution
- `server/src/maestro/pipelines/*` - Pipeline engine
- `server/src/maestro/provenance/*` - Merkle ledger
- `services/copilot/*` - User-facing copilot
- `src/maestro/v*/*` - Versioned implementations

---

## 2. Assets

| Asset | Sensitivity | Description |
|-------|-------------|-------------|
| LLM prompts | High | System prompts, user queries, context |
| LLM responses | High | AI-generated analysis, recommendations |
| Agent credentials | Critical | API keys, service accounts for tools |
| MCP tool configs | High | Tool definitions, permissions, endpoints |
| Pipeline definitions | High | Workflow logic, data transformations |
| Provenance records | Critical | Audit trail, decision lineage |
| Cost/usage data | Medium | Token consumption, budget limits |
| Training/reference data | High | RAG corpus, knowledge bases |

---

## 3. Entry Points

| Entry Point | Protocol | Authentication | Trust Level | Description |
|-------------|----------|----------------|-------------|-------------|
| `/api/maestro/runs` | HTTPS | JWT | Authenticated | Create/manage runs |
| `/api/maestro/pipelines` | HTTPS | JWT | Authenticated | Pipeline management |
| `/api/maestro/mcp/invoke` | HTTPS | JWT + Step-up | Elevated | Tool invocation |
| `/api/copilot/query` | HTTPS | JWT | Authenticated | User copilot queries |
| MCP Server endpoints | Various | mTLS + API key | Internal | Tool execution |
| LLM Provider APIs | HTTPS | API key | External | OpenAI, Anthropic, etc. |

---

## 4. Trust Boundaries

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          Maestro Execution Flow                              │
│                                                                             │
│  ┌─────────┐    ┌───────────────┐    ┌─────────────┐    ┌───────────────┐  │
│  │  User   │───▶│ Maestro Core  │───▶│ LLM Gateway │───▶│ LLM Provider  │  │
│  │ Request │    │  (Conductor)  │    │   (Proxy)   │    │  (External)   │  │
│  └─────────┘    └───────────────┘    └─────────────┘    └───────────────┘  │
│       │               │                    │                   │            │
│  [Untrusted]    [Orchestration]      [Sanitization]       [External]       │
│                       │                    │                                │
│                       ▼                    ▼                                │
│               ┌─────────────┐      ┌─────────────┐                         │
│               │ MCP Servers │      │  Provenance │                         │
│               │   (Tools)   │      │   Ledger    │                         │
│               └─────────────┘      └─────────────┘                         │
│                     │                    │                                  │
│               [Tool Sandbox]       [Immutable Log]                         │
└─────────────────────────────────────────────────────────────────────────────┘
```

| Boundary | From | To | Controls |
|----------|------|-----|----------|
| User → Maestro | Untrusted | Application | JWT, rate limiting, input validation |
| Maestro → LLM | Application | External | API key rotation, prompt sanitization |
| Maestro → MCP | Application | Tool | Step-up auth, tool allowlist, sandbox |
| MCP → External | Tool | External | Egress filtering, credential scoping |
| Maestro → Provenance | Application | Audit | Append-only, Merkle proof |

---

## 5. Threats

### 5.1 STRIDE Threats

| ID | Category | Threat | Attack Vector | Likelihood | Impact | Risk |
|----|----------|--------|---------------|------------|--------|------|
| T01 | Spoofing | Impersonate authorized user | Stolen credentials to run AI tasks | Medium | Critical | Critical |
| T02 | Spoofing | MCP tool impersonation | Rogue tool returns malicious results | Low | Critical | High |
| T03 | Tampering | Prompt manipulation | Modify prompts to alter AI behavior | Medium | High | High |
| T04 | Tampering | Pipeline definition tampering | Inject malicious pipeline steps | Low | Critical | High |
| T05 | Tampering | Provenance record modification | Alter audit trail to hide actions | Low | Critical | High |
| T06 | Repudiation | AI action denial | Deny triggering harmful AI actions | Medium | High | High |
| T07 | Info Disclosure | Prompt leakage | System prompts exposed to users | Medium | High | High |
| T08 | Info Disclosure | Cross-tenant context bleed | RAG returns other tenant's data | Medium | Critical | Critical |
| T09 | Info Disclosure | LLM data exfiltration | AI encodes sensitive data in outputs | Low | High | Medium |
| T10 | DoS | Token exhaustion | Malicious queries consume budget | High | Medium | High |
| T11 | DoS | Pipeline infinite loop | Pipeline recursion exhausts resources | Medium | High | High |
| T12 | Elevation | Tool privilege escalation | MCP tool used beyond permissions | Medium | Critical | Critical |
| T13 | Elevation | Agent autonomy escape | Agent bypasses human approval | Medium | Critical | Critical |

### 5.2 AI/Agent-Specific Threats

| ID | Category | Threat | Attack Vector | Likelihood | Impact | Risk |
|----|----------|--------|---------------|------------|--------|------|
| A01 | Prompt Injection | Direct injection | User input becomes instruction | High | Critical | Critical |
| A02 | Prompt Injection | Indirect injection | RAG context contains malicious instructions | Medium | Critical | Critical |
| A03 | Model Abuse | Harmful content generation | Jailbreak prompts bypass guardrails | Medium | High | High |
| A04 | Model Abuse | Unauthorized data extraction | Prompt designed to extract training data | Low | Medium | Low |
| A05 | Data Poisoning | RAG corpus poisoning | Inject false information into knowledge base | Low | High | Medium |
| A06 | Goal Hijacking | Task redirection | Manipulate agent to perform unintended tasks | Medium | Critical | Critical |
| A07 | Over-Autonomy | Unapproved actions | Agent takes high-risk actions without review | Medium | Critical | Critical |
| A08 | Chain Escape | Multi-step exploitation | Chain of prompts escalates privileges | Low | Critical | High |

---

## 6. Mitigations

| Threat ID | Mitigation | Status | Implementation | Owner |
|-----------|------------|--------|----------------|-------|
| T01 | JWT + step-up for sensitive operations | Implemented | `server/src/maestro/mcp/invoke-api.ts` | Auth Team |
| T02 | MCP server signature verification | Implemented | `conductor-ui/frontend/src/maestro/utils/supplyChainVerification.ts` | AI Team |
| T03 | Prompt template enforcement | Implemented | `server/src/maestro/langchain/prompts/templates.ts` | AI Team |
| T04 | Pipeline schema validation, approval workflow | Implemented | `server/src/maestro/pipelines/pipelines-api.ts` | AI Team |
| T05 | Merkle tree provenance, append-only log | Implemented | `server/src/maestro/provenance/merkle-ledger.ts` | AI Team |
| T06 | Comprehensive execution audit logging | Implemented | `server/src/maestro/mcp/audit-api.ts` | Security |
| T07 | System prompt isolation, no reflection | Implemented | LLM gateway config | AI Team |
| T08 | Tenant-scoped RAG retrieval | Implemented | `server/src/maestro/assistant/graphrag-service.ts` | AI Team |
| T09 | Output filtering, PII detection | Implemented | Output middleware | AI Team |
| T10 | Per-user token budgets, cost metering | Implemented | `server/src/maestro/cost_meter.ts` | AI Team |
| T11 | Max pipeline depth, execution timeout | Implemented | `server/src/maestro/pipelines/pipelines-api.ts` | AI Team |
| T12 | Tool permission scoping, least privilege | Implemented | `server/src/maestro/mcp/MCPServersRepo.ts` | AI Team |
| T13 | Human-in-the-loop for high-risk actions | Implemented | `src/maestro/v4/risk/scorer.ts` | AI Team |
| A01 | Input sanitization, prompt guards | Implemented | Prompt preprocessing | AI Team |
| A02 | RAG source validation, content filtering | Implemented | GraphRAG pipeline | AI Team |
| A03 | Content policy enforcement | Implemented | LLM gateway | AI Team |
| A04 | Output monitoring, anomaly detection | Implemented | Security monitoring | Security |
| A05 | Corpus integrity verification | Planned | Backlog | AI Team |
| A06 | Goal boundary enforcement | Implemented | Agent constraints | AI Team |
| A07 | Action classification, approval gates | Implemented | Risk scorer | AI Team |
| A08 | Chain length limits, context isolation | Implemented | Orchestration config | AI Team |

### Mitigation Details

#### M-AI-01: Prompt Injection Defense
**Addresses**: A01, A02, T03
**Description**: Multi-layer defense against prompt injection attacks.
**Implementation**:
```typescript
// server/src/maestro/langchain/prompts/templates.ts
const promptGuards = {
  // Strip potential injection patterns
  sanitizeInput: (input: string) => {
    return input
      .replace(/\[INST\]/gi, '')
      .replace(/\[\/INST\]/gi, '')
      .replace(/<<SYS>>/gi, '')
      .replace(/<\|.*?\|>/g, '')
      .replace(/###\s*(system|instruction)/gi, '');
  },
  // Validate RAG context
  validateContext: (context: string[]) => {
    return context.filter(c => !containsInjectionPatterns(c));
  },
};
```

#### M-AI-02: Human-in-the-Loop Controls
**Addresses**: A07, T12, T13
**Description**: Risk-based approval gates for autonomous agent actions.
**Implementation**:
```typescript
// src/maestro/v4/risk/scorer.ts
const riskThresholds = {
  autoApprove: 0.3,      // Low risk: auto-approve
  reviewRequired: 0.6,   // Medium risk: async review
  blockUntilApproved: 0.9, // High risk: synchronous approval
};

async function evaluateAction(action: AgentAction): Promise<RiskDecision> {
  const riskScore = calculateRiskScore(action);
  if (riskScore > riskThresholds.blockUntilApproved) {
    return { decision: 'BLOCK', requiresApproval: true, approvers: ['security'] };
  }
  // ...
}
```

#### M-AI-03: Provenance Tracking
**Addresses**: T05, T06
**Description**: Immutable audit trail with cryptographic integrity.
**Implementation**:
```typescript
// server/src/maestro/provenance/merkle-ledger.ts
class MerkleLedger {
  async recordExecution(run: RunRecord): Promise<ProvenanceEntry> {
    const entry = {
      runId: run.id,
      userId: run.userId,
      tenantId: run.tenantId,
      action: run.action,
      inputs: hash(run.inputs),
      outputs: hash(run.outputs),
      timestamp: Date.now(),
      previousHash: this.getLatestHash(),
    };
    entry.hash = computeMerkleRoot(entry);
    await this.append(entry);
    return entry;
  }
}
```

---

## 7. Residual Risk

| Threat ID | Residual Risk | Severity | Acceptance Rationale | Accepted By | Date |
|-----------|---------------|----------|---------------------|-------------|------|
| A01 | Novel injection techniques may evade guards | Medium | Defense in depth; monitoring catches anomalies | AI Lead | 2025-12-06 |
| A03 | Edge-case jailbreaks possible | Medium | Content monitoring; rapid response process | AI Lead | 2025-12-06 |
| T08 | Embedding similarity may leak adjacent data | Low | Tenant isolation at retrieval; acceptable for authorized users | Security Lead | 2025-12-06 |
| T10 | Burst usage may exceed budget before enforcement | Low | Budget checks frequent; acceptable short-term overage | Platform Lead | 2025-12-06 |

---

## 8. Security Controls Summary

### Preventive Controls
- [x] Prompt sanitization and validation
- [x] RAG tenant isolation
- [x] MCP tool allowlisting
- [x] Action risk scoring
- [x] Human approval gates
- [x] Token budget enforcement
- [x] Pipeline depth limits
- [x] Output content filtering

### Detective Controls
- [x] Execution audit logging
- [x] Provenance Merkle ledger
- [x] Anomaly detection on outputs
- [x] Cost usage monitoring
- [x] Red-team prompt testing in CI

### Responsive Controls
- [x] Emergency agent kill switch
- [x] Budget enforcement (hard stop)
- [x] Tool revocation capability
- [x] Incident response playbooks

---

## 9. Testing Requirements

| Threat ID | Test Type | Test Description | Automation |
|-----------|-----------|------------------|------------|
| A01 | Unit/Integration | Prompt injection test suite | Yes |
| A02 | Integration | RAG injection scenarios | Yes |
| A07 | Integration | Approval gate enforcement | Yes |
| T08 | Integration | Cross-tenant RAG isolation | Yes |
| T10 | Unit | Budget enforcement | Yes |
| T12 | Integration | Tool permission boundaries | Yes |

---

## 10. References

- [OWASP LLM Top 10](https://owasp.org/www-project-top-10-for-large-language-model-applications/)
- [NIST AI Risk Management Framework](https://www.nist.gov/itl/ai-risk-management-framework)
- [AI Agent Risk Audit](../../../security/ai-agent-risk-audit.md)
- [Maestro Core](../../../server/src/maestro/core.ts)
- [MCP Security](../../../conductor-ui/frontend/src/maestro/utils/supplyChainVerification.ts)

---

## 11. Review History

| Date | Reviewer | Changes | Version |
|------|----------|---------|---------|
| 2025-12-06 | AI Platform Team | Initial threat model | 1.0 |

---

## Approval

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Author | AI Platform Team | 2025-12-06 | Approved |
| Security Review | Security Lead | 2025-12-06 | Approved |
| Tech Lead | AI Lead | 2025-12-06 | Approved |
