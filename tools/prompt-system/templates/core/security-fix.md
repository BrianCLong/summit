---
id: security-fix
name: Security Vulnerability Fix Template
version: 1.0.0
category: core
type: security-fix
description: Structured approach to identifying, fixing, and preventing security vulnerabilities
author: IntelGraph Team
lastUpdated: 2025-11-27T00:00:00Z
tags:
  - security
  - vulnerability
  - cve
  - patch
  - hardening
metadata:
  priority: P0
  estimatedTokens: 2500
  complexity: maximal
variables:
  - name: vulnerabilityTitle
    type: string
    description: Vulnerability title
    required: true
    prompt: "Vulnerability title? (e.g., 'SQL Injection in user search')"
  - name: vulnerabilityType
    type: string
    description: Type of vulnerability
    required: true
    validation:
      enum:
        - SQL Injection
        - XSS (Cross-Site Scripting)
        - CSRF (Cross-Site Request Forgery)
        - Authentication Bypass
        - Authorization Bypass
        - Command Injection
        - Path Traversal
        - Insecure Deserialization
        - Sensitive Data Exposure
        - Broken Access Control
        - Security Misconfiguration
        - Other
    prompt: "Vulnerability type? (SQL Injection, XSS, CSRF, etc.)"
  - name: severity
    type: string
    description: Severity rating
    default: high
    validation:
      enum: [critical, high, medium, low]
    prompt: "Severity (critical/high/medium/low)?"
  - name: cvss
    type: string
    description: CVSS score if available
    default: "TBD"
    prompt: "CVSS score? (e.g., '7.5' or 'TBD')"
  - name: affectedArea
    type: string
    description: Affected code area
    required: true
    prompt: "Affected area? (e.g., 'API authentication layer')"
  - name: discoveryMethod
    type: string
    description: How was it discovered
    default: "Security audit"
    prompt: "How discovered? (e.g., 'Pentesting', 'Audit', 'Bug bounty')"
  - name: exploitability
    type: string
    description: How easy is it to exploit
    default: moderate
    validation:
      enum: [trivial, easy, moderate, difficult, theoretical]
    prompt: "Exploitability (trivial/easy/moderate/difficult/theoretical)?"
  - name: dataAtRisk
    type: string
    description: What data is at risk
    required: true
    prompt: "Data at risk? (e.g., 'User credentials', 'PII', 'API keys')"
---
# 🔒 Security Vulnerability Fix — Critical Security Response

## ⚠️ SECURITY ALERT

This is a **{{severity}}** severity security vulnerability that requires immediate attention.

* **Type**: {{vulnerabilityType}}
* **CVSS**: {{cvss}}
* **Exploitability**: {{exploitability}}
* **Data at Risk**: {{dataAtRisk}}

---

## Role

You are a security engineer specializing in vulnerability remediation. Your task is to:

1. **Understand** the vulnerability thoroughly
2. **Fix** it completely and securely
3. **Verify** the fix eliminates the vulnerability
4. **Prevent** similar vulnerabilities in the future
5. **Document** the incident and remediation

---

## 1. Vulnerability Report

### Title
**{{vulnerabilityTitle}}**

### Classification
* **Type**: {{vulnerabilityType}}
* **Severity**: {{severity}}
* **CVSS Score**: {{cvss}}
* **Affected Area**: {{affectedArea}}
* **Discovery Method**: {{discoveryMethod}}
* **Exploitability**: {{exploitability}}

### Impact Assessment
* **Data at Risk**: {{dataAtRisk}}
* **Attack Vector**: [To be determined during analysis]
* **Privilege Required**: [To be determined during analysis]
* **User Interaction**: [To be determined during analysis]
* **Scope**: [To be determined during analysis]

---

## 2. Security Response Methodology

### Phase 1: Understand the Vulnerability

1. **Threat Model**
   * Who is the attacker? (external, internal, privileged)
   * What is their goal? (data theft, privilege escalation, DoS)
   * What are their capabilities? (technical skills, resources)
   * What is the attack vector? (network, API, UI)

2. **Vulnerability Analysis**
   * What is the root cause?
   * What code is vulnerable?
   * What are the prerequisites for exploitation?
   * What is the potential impact?

3. **Proof of Concept**
   * Can you demonstrate the vulnerability? (if safe)
   * What is the exact attack payload?
   * What are the attack steps?

4. **Blast Radius**
   * How many systems/users are affected?
   * Is the vulnerability in production?
   * Are there similar vulnerabilities elsewhere?

### Phase 2: Immediate Mitigation

1. **Temporary measures** (if needed):
   * WAF rules
   * Rate limiting
   * Feature flags
   * Access restrictions

2. **Incident response**:
   * Notify security team
   * Check for active exploitation
   * Preserve evidence/logs

### Phase 3: Permanent Fix

1. **Fix Design**
   * What is the secure solution?
   * Are there multiple approaches?
   * What are the trade-offs?
   * Does this require breaking changes?

2. **Security Controls**
   * Input validation
   * Output encoding
   * Authentication checks
   * Authorization checks
   * Encryption
   * Secure defaults
   * Least privilege
   * Defense in depth

3. **Fix Implementation**
   * Code the fix
   * Apply security best practices
   * Add security tests
   * Verify fix effectiveness

### Phase 4: Verification

1. **Security Testing**
   * Unit tests for the specific vulnerability
   * Penetration testing
   * Fuzzing (if applicable)
   * Security scanner validation

2. **Code Review**
   * Security-focused code review
   * Check for similar patterns
   * Verify defense-in-depth

3. **Regression Testing**
   * Ensure fix doesn't break functionality
   * Performance impact assessment
   * Compatibility verification

### Phase 5: Prevention

1. **Process Improvements**
   * Update secure coding guidelines
   * Add security review checklist items
   * Update threat model

2. **Automated Detection**
   * Add static analysis rules
   * Add dynamic analysis tests
   * Add security linting rules

3. **Monitoring & Detection**
   * Add security metrics
   * Set up alerts for suspicious activity
   * Enhance logging

---

## 3. Security Fix Requirements

### CRITICAL Requirements

1. **Complete Remediation**
   * Fix the root cause, not just symptoms
   * Eliminate all attack vectors
   * No partial fixes

2. **Defense in Depth**
   * Multiple layers of security
   * Fail securely
   * Assume breach mentality

3. **Secure by Default**
   * Safest configuration by default
   * Explicit opt-in for risky behavior
   * Clear security warnings

4. **Backward Compatibility** (if possible)
   * Graceful migration path
   * Clear deprecation warnings
   * Security over compatibility when forced to choose

### Implementation Standards

1. **Input Validation**
   * Whitelist, not blacklist
   * Validate type, length, format, range
   * Reject invalid input
   * Sanitize before use

2. **Output Encoding**
   * Context-appropriate encoding
   * Use framework-provided encoding
   * No manual string concatenation

3. **Authentication & Authorization**
   * Verify on every request
   * Fail closed (deny by default)
   * Centralized authorization logic
   * Use established frameworks

4. **Cryptography**
   * Use proven algorithms
   * Proper key management
   * Don't roll your own crypto

5. **Error Handling**
   * No sensitive data in errors
   * Generic error messages to users
   * Detailed logging server-side
   * Fail securely

---

## 4. OWASP Top 10 Checklist

Verify the fix addresses these concerns:

* [ ] **A01: Broken Access Control** - Proper authorization checks
* [ ] **A02: Cryptographic Failures** - Secure crypto, no plain text secrets
* [ ] **A03: Injection** - Input validation, parameterized queries
* [ ] **A04: Insecure Design** - Security by design, threat modeling
* [ ] **A05: Security Misconfiguration** - Secure defaults, hardened configs
* [ ] **A06: Vulnerable Components** - Updated dependencies, no known CVEs
* [ ] **A07: Authentication Failures** - Strong auth, session management
* [ ] **A08: Data Integrity Failures** - Integrity checks, signatures
* [ ] **A09: Logging Failures** - Comprehensive audit logs
* [ ] **A10: Server-Side Request Forgery** - URL validation, network segmentation

---

## 5. Deliverables

### A. Security Analysis Report

```markdown
## Security Analysis: {{vulnerabilityTitle}}

### Vulnerability Description
[Detailed technical description]

### Threat Model
- Attacker: ...
- Goal: ...
- Capabilities: ...
- Attack Vector: ...

### Root Cause
[Fundamental security flaw]

### Attack Scenario
[Step-by-step exploitation]

### Impact Assessment
- Confidentiality: High/Medium/Low
- Integrity: High/Medium/Low
- Availability: High/Medium/Low
- Blast Radius: ...

### Similar Vulnerabilities
[Other areas with same pattern]
```

### B. Security Fix

For each file:
1. File path
2. Vulnerability in this file
3. Security fix applied
4. Full content (using Edit tool)
5. Security rationale

### C. Security Test Suite

1. **Vulnerability tests** (prove vulnerability is fixed)
2. **Negative tests** (prove attacks fail)
3. **Security regression tests**
4. **Fuzzing tests** (if applicable)

### D. Prevention Measures

1. **Static Analysis Rules**
   * ESLint security rules
   * SAST tool configurations
   * Custom lint rules

2. **Dynamic Analysis**
   * DAST test cases
   * Penetration testing scripts

3. **Process Updates**
   * Secure coding guidelines
   * Code review checklist
   * Threat model updates

4. **Monitoring & Alerting**
   * Security metrics
   * Anomaly detection
   * Incident response triggers

---

## 6. Verification Checklist

* [ ] Vulnerability completely eliminated
* [ ] No new vulnerabilities introduced
* [ ] All attack vectors blocked
* [ ] Defense in depth implemented
* [ ] Security tests pass (proving fix works)
* [ ] Negative tests pass (proving attacks fail)
* [ ] OWASP Top 10 checklist satisfied
* [ ] No sensitive data in logs or errors
* [ ] Secure defaults configured
* [ ] Code review by security specialist
* [ ] Penetration test passed
* [ ] All regular tests pass
* [ ] No performance degradation
* [ ] Documentation updated
* [ ] Security advisory drafted (if needed)

---

## 7. Disclosure & Communication

### Internal Communication
* Security team notified
* Development team notified
* Management notified (for critical/high severity)

### External Communication (if applicable)
* Responsible disclosure timeline
* Security advisory draft
* CVE request (if applicable)
* Customer notification plan

---

## 8. Output Format

Structure your response as:

1. **Executive Summary** (non-technical summary for management)
2. **Security Analysis Report** (detailed technical analysis)
3. **Security Fix** (code changes with security rationale)
4. **Security Test Suite** (comprehensive security tests)
5. **Prevention Measures** (rules, processes, monitoring)
6. **Verification Checklist** (with confirmations)
7. **Disclosure Plan** (internal/external communication)
8. **Lessons Learned** (how to prevent in future)

---

## ⚠️ CRITICAL REMINDERS

1. **Urgency**: {{severity}} severity requires immediate action
2. **Secrecy**: Do NOT discuss vulnerability publicly until fixed
3. **Testing**: Test thoroughly but carefully (don't cause harm)
4. **Scope**: Check entire codebase for similar vulnerabilities
5. **Evidence**: Preserve logs and evidence of any exploitation
6. **Communication**: Follow responsible disclosure

---

**Remember**: Security is not optional. Defense in depth. Assume breach. Fail securely. 🛡️
