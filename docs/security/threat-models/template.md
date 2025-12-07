# Threat Model: [Feature Name]

> **Owner**: [Team/Individual]
> **Last Updated**: YYYY-MM-DD
> **Risk Tier**: [Critical | High | Medium | Low]
> **Status**: [Draft | Review | Approved]

## 1. Feature Overview

**Description**: [1-2 sentence summary of what this feature does]

**Scope**:
- [Key functionality 1]
- [Key functionality 2]
- [Key functionality 3]

**Out of Scope**:
- [Explicitly excluded items]

**Related Components**:
- [Component/service 1]
- [Component/service 2]

---

## 2. Assets

| Asset | Sensitivity | Description |
|-------|-------------|-------------|
| [Asset 1] | [Critical/High/Medium/Low] | [What is this asset and why is it valuable] |
| [Asset 2] | [Critical/High/Medium/Low] | [Description] |

---

## 3. Entry Points

| Entry Point | Protocol | Authentication | Trust Level | Description |
|-------------|----------|----------------|-------------|-------------|
| [Entry 1] | [HTTP/WS/gRPC/etc] | [None/API Key/JWT/mTLS] | [Unauthenticated/Authenticated/Internal] | [What this entry point does] |
| [Entry 2] | [Protocol] | [Auth method] | [Trust level] | [Description] |

---

## 4. Trust Boundaries

```
┌─────────────────────────────────────────────────────────┐
│                    [Diagram Title]                       │
│                                                         │
│  ┌─────────┐    ┌─────────────┐    ┌─────────────────┐ │
│  │ Client  │───▶│   API GW    │───▶│   Backend Svc   │ │
│  └─────────┘    └─────────────┘    └─────────────────┘ │
│       │              │                     │            │
│       ▼              ▼                     ▼            │
│   [Untrusted]   [Trust Boundary]      [Internal]       │
└─────────────────────────────────────────────────────────┘
```

| Boundary | From | To | Controls |
|----------|------|-----|----------|
| [Boundary 1] | [Zone] | [Zone] | [TLS, JWT validation, etc.] |
| [Boundary 2] | [Zone] | [Zone] | [Controls] |

---

## 5. Threats

### 5.1 STRIDE Threats

| ID | Category | Threat | Attack Vector | Likelihood | Impact | Risk |
|----|----------|--------|---------------|------------|--------|------|
| T01 | Spoofing | [Threat description] | [How attack works] | [H/M/L] | [C/H/M/L] | [Risk level] |
| T02 | Tampering | [Threat description] | [How attack works] | [H/M/L] | [C/H/M/L] | [Risk level] |
| T03 | Repudiation | [Threat description] | [How attack works] | [H/M/L] | [C/H/M/L] | [Risk level] |
| T04 | Info Disclosure | [Threat description] | [How attack works] | [H/M/L] | [C/H/M/L] | [Risk level] |
| T05 | Denial of Service | [Threat description] | [How attack works] | [H/M/L] | [C/H/M/L] | [Risk level] |
| T06 | Elevation of Priv | [Threat description] | [How attack works] | [H/M/L] | [C/H/M/L] | [Risk level] |

### 5.2 AI/Agent-Specific Threats (if applicable)

| ID | Category | Threat | Attack Vector | Likelihood | Impact | Risk |
|----|----------|--------|---------------|------------|--------|------|
| A01 | Prompt Injection | [Threat description] | [How attack works] | [H/M/L] | [C/H/M/L] | [Risk level] |
| A02 | Model Abuse | [Threat description] | [How attack works] | [H/M/L] | [C/H/M/L] | [Risk level] |
| A03 | Data Poisoning | [Threat description] | [How attack works] | [H/M/L] | [C/H/M/L] | [Risk level] |
| A04 | Goal Hijacking | [Threat description] | [How attack works] | [H/M/L] | [C/H/M/L] | [Risk level] |
| A05 | Over-Autonomy | [Threat description] | [How attack works] | [H/M/L] | [C/H/M/L] | [Risk level] |

---

## 6. Mitigations

| Threat ID | Mitigation | Status | Implementation | Owner |
|-----------|------------|--------|----------------|-------|
| T01 | [Mitigation description] | [Implemented/Planned/N/A] | [File path or ticket] | [Team] |
| T02 | [Mitigation description] | [Status] | [Implementation] | [Owner] |

### Mitigation Details

#### M01: [Mitigation Name]
**Addresses**: T01, T02
**Description**: [Detailed description of the mitigation]
**Implementation**:
```typescript
// Example code or configuration
```

---

## 7. Residual Risk

| Threat ID | Residual Risk | Severity | Acceptance Rationale | Accepted By | Date |
|-----------|---------------|----------|---------------------|-------------|------|
| T01 | [What risk remains] | [H/M/L] | [Why this is acceptable] | [Name/Role] | [Date] |

---

## 8. Security Controls Summary

### Preventive Controls
- [ ] [Control 1]
- [ ] [Control 2]

### Detective Controls
- [ ] [Control 1]
- [ ] [Control 2]

### Responsive Controls
- [ ] [Control 1]
- [ ] [Control 2]

---

## 9. Testing Requirements

| Threat ID | Test Type | Test Description | Automation |
|-----------|-----------|------------------|------------|
| T01 | [Unit/Integration/Pentest] | [What to test] | [Yes/No] |

---

## 10. References

- [Link to design doc]
- [Link to related threat models]
- [External references]

---

## 11. Review History

| Date | Reviewer | Changes | Version |
|------|----------|---------|---------|
| [Date] | [Name] | Initial draft | 0.1 |
| [Date] | [Name] | [Changes made] | 1.0 |

---

## Approval

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Author | | | |
| Security Review | | | |
| Tech Lead | | | |
