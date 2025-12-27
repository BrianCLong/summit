# Threat Model: AI Copilot

**Subsystem:** AI Copilot Service
**Version:** 1.0
**Date:** 2025-12-27
**Methodology:** STRIDE + AI-Specific Threats
**Owner:** Security Team
**Status:** GA Hardening Review

## System Overview

The AI Copilot is a Python FastAPI service that provides:
- Natural Language to Cypher query translation
- RAG (Retrieval Augmented Generation) for knowledge queries
- Policy guardrails for content filtering
- Sandbox execution environment
- PII detection and redaction

### Architecture Components
- **Entry Points:** `/copilot/query`, `/copilot/rag`
- **Dependencies:** Graph database (simulated via sandbox), Document store
- **Data Flow:** User Query → Policy Check → NL Translation → Allowlist Check → Sandbox Execution
- **Technology Stack:** Python, FastAPI, Pydantic

### Special Considerations
- AI/LLM integration introduces unique attack vectors
- Prompt engineering can bypass controls
- Model outputs are probabilistic and unpredictable

---

## STRIDE Analysis

### S - Spoofing Identity

#### Threat 1.1: API Endpoint Spoofing
**Description:** Attacker impersonates copilot service
**Attack Vector:** Man-in-the-middle or DNS spoofing
**DREAD Score:**
- Damage: 8 (Malicious responses)
- Reproducibility: 5 (Network access needed)
- Exploitability: 6 (Requires network position)
- Affected Users: 9 (Wide impact)
- Discoverability: 7 (Standard attack)
- **Total: 7.0 (HIGH)**

**Existing Mitigation:**
- None identified in code

**Required Mitigation:**
- Implement mutual TLS (mTLS)
- Use service mesh with strong identity
- Implement request signing
- Add service-to-service authentication

**SOC 2 Mapping:** CC6.1, CC6.6

**Gap Status:** 🔴 CRITICAL GAP - No service authentication

---

### T - Tampering with Data

#### Threat 2.1: Prompt Injection via Natural Language
**Description:** Malicious prompts manipulate AI to generate harmful queries
**Attack Vector:** Crafted natural language inputs that override system instructions
**DREAD Score:**
- Damage: 9 (Arbitrary query execution)
- Reproducibility: 7 (Known techniques)
- Exploitability: 8 (Emerging attack class)
- Affected Users: 10 (All users)
- Discoverability: 8 (Active research area)
- **Total: 8.4 (CRITICAL)**

**Existing Mitigation:**
- Basic policy check (delete, export, ssn keywords)
- Allowlist check for Cypher clauses
- Sandbox execution

**Required Mitigation:**
- Implement semantic analysis of prompts
- Use adversarial prompt detection
- Add input/output validation with ML models
- Implement prompt sanitization
- Use structured input formats where possible
- Add examples of denied prompts for training
- Monitor for prompt injection patterns

**SOC 2 Mapping:** CC6.2, PI1.2, CC8.1

**Gap Status:** 🔴 CRITICAL GAP - Simplistic keyword filtering insufficient

---

#### Threat 2.2: Cypher Query Manipulation
**Description:** Generated Cypher queries bypass allowlist controls
**Attack Vector:** NL inputs that generate valid-looking but malicious queries
**DREAD Score:**
- Damage: 8 (Data modification)
- Reproducibility: 6 (Depends on generation)
- Exploitability: 7 (Requires understanding)
- Affected Users: 9 (Data integrity)
- Discoverability: 7 (Testing needed)
- **Total: 7.4 (HIGH)**

**Existing Mitigation:**
- Hardcoded allowlist: {MATCH, RETURN, WHERE, LIMIT, COUNT, AS}
- Forbidden list: {CREATE, DELETE, MERGE, SET, DROP}
- Token-based validation

**Required Mitigation:**
- Use Cypher AST (Abstract Syntax Tree) parsing
- Implement query parameterization
- Add semantic query analysis
- Use prepared statements
- Implement query rewriting
- Add post-generation validation
- Test against OWASP query injection patterns

**SOC 2 Mapping:** PI1.2, CC8.1

**Gap Status:** ⚠️ PARTIAL - String-based filtering is fragile

---

#### Threat 2.3: Training Data Poisoning
**Description:** Malicious inputs corrupt future model behavior
**Attack Vector:** Adversarial examples fed to active learning
**DREAD Score:**
- Damage: 9 (Model corruption)
- Reproducibility: 4 (Long-term attack)
- Exploitability: 5 (Requires persistence)
- Affected Users: 10 (All future users)
- Discoverability: 3 (Subtle impact)
- **Total: 6.2 (MEDIUM)**

**Existing Mitigation:**
- None identified

**Required Mitigation:**
- Implement input validation pipeline
- Add anomaly detection for training data
- Use human-in-the-loop for validation
- Implement model versioning and rollback
- Monitor model performance metrics
- Add data provenance tracking

**SOC 2 Mapping:** PI1.1, PI1.2, CC8.1

**Gap Status:** 🔴 CRITICAL GAP - No training data validation

---

### R - Repudiation

#### Threat 3.1: Unlogged AI Decisions
**Description:** AI-generated queries and responses not fully audited
**Attack Vector:** Missing audit trail for AI decisions
**DREAD Score:**
- Damage: 7 (Forensic blindness)
- Reproducibility: 10 (No logging present)
- Exploitability: 1 (N/A)
- Affected Users: 5 (Indirect)
- Discoverability: 9 (Obvious gap)
- **Total: 6.4 (MEDIUM)**

**Existing Mitigation:**
- None identified in code

**Required Mitigation:**
- Log all AI interactions:
  - Input prompt
  - Generated query
  - Policy check results
  - Execution results
  - User context
  - Timestamp
  - Model version
- Implement immutable audit logs
- Add AI decision explanations
- Track model inference metadata

**SOC 2 Mapping:** CC4.1, CC7.3, A1.2

**Gap Status:** 🔴 CRITICAL GAP - No AI audit logging

---

### I - Information Disclosure

#### Threat 4.1: PII Leakage via RAG
**Description:** Redacted documents returned through RAG retrieval
**Attack Vector:** Adversarial queries bypass redaction filter
**DREAD Score:**
- Damage: 10 (PII exposure)
- Reproducibility: 6 (Depends on filter)
- Exploitability: 7 (Known bypass techniques)
- Affected Users: 10 (Privacy impact)
- Discoverability: 8 (Common concern)
- **Total: 8.2 (CRITICAL)**

**Existing Mitigation:**
- Redacted flag on documents
- Filter in retrieve() function: `if emb["redacted"]: continue`

**Required Mitigation:**
- Implement multi-layer PII detection
- Use ML-based PII detection (not just flags)
- Add runtime PII scanning of responses
- Implement data classification system
- Add access control based on data sensitivity
- Use differential privacy techniques
- Regular PII detection audits

**SOC 2 Mapping:** P3.1, P4.1, C1.1, P8.1

**Gap Status:** ⚠️ PARTIAL - Flag-based filtering is incomplete

---

#### Threat 4.2: Model Inversion/Extraction
**Description:** Attackers extract training data or model parameters
**Attack Vector:** Repeated queries to infer private training data
**DREAD Score:**
- Damage: 8 (IP theft, privacy)
- Reproducibility: 5 (Requires many queries)
- Exploitability: 6 (Advanced technique)
- Affected Users: 10 (All data subjects)
- Discoverability: 5 (Research area)
- **Total: 6.8 (HIGH)**

**Existing Mitigation:**
- Sandbox with limited data (50 docs)

**Required Mitigation:**
- Implement query rate limiting per user
- Add query pattern analysis
- Use output randomization/noise injection
- Monitor for extraction patterns
- Implement model watermarking
- Add query diversity requirements

**SOC 2 Mapping:** C1.1, C1.2, P4.1

**Gap Status:** ⚠️ PARTIAL - Limited data helps but insufficient

---

#### Threat 4.3: Indirect Prompt Injection via RAG
**Description:** Malicious content in documents influences AI responses
**Attack Vector:** Poisoned documents with embedded instructions
**DREAD Score:**
- Damage: 9 (Compromised responses)
- Reproducibility: 7 (If docs poisoned)
- Exploitability: 8 (Emerging threat)
- Affected Users: 10 (All users)
- Discoverability: 6 (Novel attack)
- **Total: 8.0 (CRITICAL)**

**Existing Mitigation:**
- None identified

**Required Mitigation:**
- Sanitize all retrieved documents
- Remove potential instruction markers
- Use context isolation techniques
- Implement document validation pipeline
- Add content security policies
- Monitor for instruction-like patterns in docs

**SOC 2 Mapping:** PI1.2, CC8.1

**Gap Status:** 🔴 CRITICAL GAP - No document sanitization

---

### D - Denial of Service

#### Threat 5.1: Timeout Bypass via Complex Queries
**Description:** Expensive queries bypass 2-second timeout
**Attack Vector:** Queries that appear simple but execute slowly
**DREAD Score:**
- Damage: 7 (Service degradation)
- Reproducibility: 8 (Repeatable)
- Exploitability: 7 (Easy to craft)
- Affected Users: 10 (All users)
- Discoverability: 8 (Testing reveals)
- **Total: 8.0 (CRITICAL)**

**Existing Mitigation:**
- 2-second timeout: `QUERY_TIMEOUT_SECONDS = 2`
- Asyncio timeout wrapper

**Required Mitigation:**
- Implement query cost estimation before execution
- Add query complexity analysis
- Use adaptive timeouts based on system load
- Implement circuit breakers
- Add resource quotas per user
- Monitor query execution times

**SOC 2 Mapping:** A1.1, A1.2

**Gap Status:** ⚠️ PARTIAL - Timeout exists but no complexity analysis

---

#### Threat 5.2: RAG Retrieval Flooding
**Description:** Expensive similarity calculations exhaust resources
**Attack Vector:** Queries matching many documents
**DREAD Score:**
- Damage: 6 (Performance impact)
- Reproducibility: 9 (Easy to trigger)
- Exploitability: 8 (Simple queries)
- Affected Users: 10 (All users)
- Discoverability: 9 (Obvious)
- **Total: 8.4 (CRITICAL)**

**Existing Mitigation:**
- Limited to 50 documents in sandbox

**Required Mitigation:**
- Implement early stopping in retrieval
- Add maximum documents to scan limit
- Use approximate nearest neighbor (ANN) search
- Implement caching for common queries
- Add index-based retrieval instead of linear scan
- Set maximum embedding comparisons

**SOC 2 Mapping:** A1.1, A1.2

**Gap Status:** ⚠️ PARTIAL - Sandbox limit helps but production vulnerable

---

### E - Elevation of Privilege

#### Threat 6.1: Policy Check Bypass
**Description:** Malicious inputs evade simple keyword filtering
**Attack Vector:** Obfuscation, encoding, or synonym use
**DREAD Score:**
- Damage: 9 (Policy violations)
- Reproducibility: 8 (Many techniques)
- Exploitability: 8 (Well-known)
- Affected Users: 10 (All users)
- Discoverability: 9 (Easy to test)
- **Total: 8.8 (CRITICAL)**

**Existing Mitigation:**
- Simple lowercase string matching:
  - "delete" → reject
  - "export" → reject
  - "ssn" → reject

**Required Mitigation:**
- Implement semantic policy checking
- Use NLP-based intent classification
- Add multiple representation checks (Unicode, encoding)
- Implement allowlist instead of denylist
- Use ML-based policy violation detection
- Regular policy effectiveness audits
- Add synonym and homograph detection

**SOC 2 Mapping:** CC6.2, PI1.1

**Gap Status:** 🔴 CRITICAL GAP - Trivially bypassable

---

#### Threat 6.2: Sandbox Escape
**Description:** Generated queries access real database instead of sandbox
**Attack Vector:** Configuration errors or code vulnerabilities
**DREAD Score:**
- Damage: 10 (Full DB access)
- Reproducibility: 3 (Rare condition)
- Exploitability: 4 (Requires bug)
- Affected Users: 10 (All data)
- Discoverability: 5 (Needs testing)
- **Total: 6.4 (MEDIUM)**

**Existing Mitigation:**
- Hardcoded SANDBOX_DATA array
- No actual database connection

**Required Mitigation:**
- Implement strict sandbox isolation
- Use separate credentials for sandbox
- Add runtime environment validation
- Implement network isolation
- Regular sandbox integrity checks
- Add sandbox escape detection

**SOC 2 Mapping:** CC6.2, C1.1

**Gap Status:** ✅ CONTROLLED - Sandbox is isolated

---

## AI-Specific Threat Categories

### Bias Amplification

#### Threat 7.1: Discriminatory Query Generation
**Description:** AI generates queries with biased filtering
**Attack Vector:** Training data bias manifests in query logic
**DREAD Score:**
- Damage: 8 (Discrimination)
- Reproducibility: 6 (Depends on training)
- Exploitability: 4 (Unintentional)
- Affected Users: 7 (Protected classes)
- Discoverability: 5 (Hard to detect)
- **Total: 6.0 (MEDIUM)**

**Existing Mitigation:**
- None identified

**Required Mitigation:**
- Implement bias detection in queries
- Add fairness metrics monitoring
- Use bias mitigation techniques in model
- Regular bias audits
- Diverse training data validation
- Human review of sensitive queries

**SOC 2 Mapping:** PI1.1, PI1.2

**Gap Status:** 🔴 CRITICAL GAP - No bias detection

---

### Data Exfiltration

#### Threat 7.2: Aggregation Attack via Multiple Queries
**Description:** Attacker reconstructs private data through many queries
**Attack Vector:** Sequential queries each returning partial information
**DREAD Score:**
- Damage: 9 (Privacy breach)
- Reproducibility: 7 (Systematic approach)
- Exploitability: 6 (Requires planning)
- Affected Users: 10 (PII exposure)
- Discoverability: 4 (Subtle pattern)
- **Total: 7.2 (HIGH)**

**Existing Mitigation:**
- LIMIT clause in generated queries

**Required Mitigation:**
- Implement differential privacy
- Add k-anonymity checks
- Monitor query patterns per user
- Implement query result size limits
- Add noise to aggregate results
- Track cumulative data exposure per user

**SOC 2 Mapping:** P4.1, C1.1, C1.2

**Gap Status:** 🔴 CRITICAL GAP - No aggregation protection

---

### Model Manipulation

#### Threat 7.3: Adversarial Examples
**Description:** Carefully crafted inputs cause misclassification
**Attack Vector:** Inputs optimized to fool policy checks
**DREAD Score:**
- Damage: 8 (Policy bypass)
- Reproducibility: 5 (Requires optimization)
- Exploitability: 6 (Tools available)
- Affected Users: 10 (All users)
- Discoverability: 6 (Requires expertise)
- **Total: 7.0 (HIGH)**

**Existing Mitigation:**
- Simple policy checks (insufficient)

**Required Mitigation:**
- Implement adversarial training
- Add input perturbation detection
- Use ensemble models
- Implement confidence thresholds
- Regular adversarial testing
- Monitor for suspicious input patterns

**SOC 2 Mapping:** CC6.2, PI1.2

**Gap Status:** 🔴 CRITICAL GAP - No adversarial defenses

---

## Summary of Findings

### Critical Gaps (Immediate Action Required)
1. **Prompt injection vulnerability** - Trivial keyword bypass
2. **Policy check bypass** - Simple string matching insufficient
3. **No AI audit logging** - Complete forensic blindness
4. **PII leakage risk** - Flag-based filtering incomplete
5. **Indirect prompt injection** - No document sanitization
6. **DoS via RAG flooding** - Linear scan vulnerable
7. **No bias detection** - Fairness risks
8. **No aggregation protection** - Data exfiltration possible

### High Priority Gaps
1. Cypher manipulation possible
2. Model inversion attacks possible
3. Training data poisoning risk
4. No service authentication
5. Adversarial examples not defended

### Medium Priority Gaps
1. Sandbox escape potential
2. Unlogged AI decisions
3. Timeout bypass possible

### Compliance Impact
- **SOC 2 Privacy (P1-P8):** 4 critical gaps in PII protection
- **SOC 2 Processing Integrity:** 5 gaps in AI output validation
- **SOC 2 Confidentiality:** 3 information disclosure risks
- **SOC 2 Availability:** 2 DoS vulnerabilities

---

## Recommendations

### Immediate Actions (Week 1)
1. Replace keyword filtering with semantic analysis
2. Implement comprehensive AI audit logging
3. Add Cypher AST parsing for query validation
4. Implement PII detection with ML models
5. Add document sanitization for RAG

### Short-term Actions (Month 1)
1. Implement prompt injection detection
2. Add service-to-service authentication (mTLS)
3. Implement query complexity analysis
4. Add bias detection and monitoring
5. Implement differential privacy
6. Add adversarial training

### Long-term Actions (Quarter 1)
1. Regular AI security audits
2. Red team testing with prompt injection specialists
3. Implement AI safety certification
4. Establish AI governance framework
5. Create AI ethics review board
6. Regular bias audits

### Research and Development
1. Evaluate commercial AI security tools
2. Implement model watermarking
3. Research latest prompt injection defenses
4. Evaluate federated learning for privacy
5. Implement explainable AI (XAI) for transparency

---

## Approval and Sign-off

**Reviewed By:** _____________________
**Date:** _____________________
**Next Review:** 2026-03-27 (Quarterly)

**Special Note:** AI/ML systems require more frequent security reviews due to rapidly evolving threat landscape. Recommend monthly reviews until maturity.
