# Threat Model: Data Ingest (Streaming)

**Subsystem:** Streaming Ingest Service
**Version:** 1.0
**Date:** 2025-12-27
**Methodology:** STRIDE + Supply Chain Security
**Owner:** Security Team
**Status:** GA Hardening Review

## System Overview

The Streaming Ingest Service is a Node.js Fastify service that:
- Consumes events from Kafka topics
- Stores events in PostgreSQL event store
- Supports replay functionality with checkpoints
- Provides batch and streaming modes
- Exposes REST API for replay and checkpoint management

### Architecture Components
- **Entry Points:** Kafka topics, REST API endpoints (`/replay`, `/checkpoint`)
- **Dependencies:** Kafka brokers, PostgreSQL database
- **Data Flow:** Kafka → Consumer → Event Store → PostgreSQL
- **Technology Stack:** Node.js, Fastify, Kafka, PostgreSQL, Pino logger

### Critical Data Paths
1. External data sources → Kafka → Ingest service → Database
2. Replay requests → Event store → Kafka republish
3. Checkpoint management → Database persistence

---

## STRIDE Analysis

### S - Spoofing Identity

#### Threat 1.1: Unauthenticated Kafka Producer
**Description:** Malicious producers inject events without authentication
**Attack Vector:** Direct connection to Kafka without validation
**DREAD Score:**
- Damage: 10 (Data poisoning)
- Reproducibility: 8 (If Kafka exposed)
- Exploitability: 7 (Requires network access)
- Affected Users: 10 (All downstream)
- Discoverability: 8 (Common weakness)
- **Total: 8.6 (CRITICAL)**

**Existing Mitigation:**
- Kafka broker configuration (not in code)

**Required Mitigation:**
- Implement Kafka SASL authentication (SCRAM-SHA-512)
- Use mutual TLS for producer authentication
- Implement producer ACLs
- Add message signing with HMAC
- Validate producer identity in consumer
- Monitor for unauthorized producers

**SOC 2 Mapping:** CC6.1, CC6.2, PI1.1

**Gap Status:** 🔴 CRITICAL GAP - No authentication visible in code

---

#### Threat 1.2: API Endpoint Spoofing
**Description:** Unauthorized access to replay/checkpoint APIs
**Attack Vector:** Direct API calls without authentication
**DREAD Score:**
- Damage: 8 (Data manipulation)
- Reproducibility: 9 (Easy if exposed)
- Exploitability: 9 (No auth visible)
- Affected Users: 10 (All users)
- Discoverability: 10 (Obvious)
- **Total: 9.2 (CRITICAL)**

**Existing Mitigation:**
- None identified in code

**Required Mitigation:**
- Implement API authentication (JWT, API keys)
- Add role-based access control (RBAC)
- Use mutual TLS for service-to-service
- Implement request signing
- Add IP allowlisting for admin endpoints

**SOC 2 Mapping:** CC6.1, CC6.2, CC6.6

**Gap Status:** 🔴 CRITICAL GAP - No API authentication

---

### T - Tampering with Data

#### Threat 2.1: Message Tampering in Transit
**Description:** Kafka messages modified between producer and consumer
**Attack Vector:** Man-in-the-middle on Kafka protocol
**DREAD Score:**
- Damage: 9 (Data corruption)
- Reproducibility: 5 (Requires network access)
- Exploitability: 6 (Network interception)
- Affected Users: 10 (Data integrity)
- Discoverability: 7 (Standard attack)
- **Total: 7.4 (HIGH)**

**Existing Mitigation:**
- Kafka broker configuration (assumed)

**Required Mitigation:**
- Enable Kafka SSL/TLS encryption
- Implement message-level encryption
- Add message integrity checks (HMAC)
- Use Kafka message headers for signatures
- Implement end-to-end encryption
- Monitor for message anomalies

**SOC 2 Mapping:** CC6.7, PI1.2, C1.2

**Gap Status:** ⚠️ PARTIAL - Depends on Kafka configuration

---

#### Threat 2.2: Data Poisoning via Malicious Events
**Description:** Crafted events corrupt downstream systems
**Attack Vector:** Malformed, oversized, or malicious event payloads
**DREAD Score:**
- Damage: 9 (System compromise)
- Reproducibility: 8 (Repeatable)
- Exploitability: 7 (Requires access)
- Affected Users: 10 (All systems)
- Discoverability: 8 (Known attack)
- **Total: 8.4 (CRITICAL)**

**Existing Mitigation:**
- None identified in code

**Required Mitigation:**
- Implement strict event schema validation (JSON Schema, Avro)
- Add size limits for event payloads
- Validate all fields against expected types
- Sanitize string inputs
- Implement allowlist for event types
- Add malware scanning for binary data
- Use content security policies

**SOC 2 Mapping:** PI1.2, CC8.1, CC6.2

**Gap Status:** 🔴 CRITICAL GAP - No input validation

---

#### Threat 2.3: Replay Manipulation
**Description:** Unauthorized replay requests corrupt event streams
**Attack Vector:** Malicious replay with modified parameters
**DREAD Score:**
- Damage: 8 (Duplicate/corrupt events)
- Reproducibility: 9 (Easy to call)
- Exploitability: 8 (No validation)
- Affected Users: 10 (All consumers)
- Discoverability: 9 (Exposed endpoint)
- **Total: 8.8 (CRITICAL)**

**Existing Mitigation:**
- Basic parameter validation: `ReplayRequestSchema.parse(request.body)`

**Required Mitigation:**
- Implement authorization for replay operations
- Add replay request audit logging
- Validate replay time ranges
- Implement replay rate limiting
- Add approval workflow for large replays
- Monitor for abnormal replay patterns
- Implement replay impact analysis

**SOC 2 Mapping:** CC6.2, CC7.2, PI1.1

**Gap Status:** ⚠️ PARTIAL - Schema validation exists but no authz

---

### R - Repudiation

#### Threat 3.1: Missing Event Provenance
**Description:** Cannot trace origin and chain of custody for events
**Attack Vector:** Insufficient metadata in events and logs
**DREAD Score:**
- Damage: 7 (Forensic impact)
- Reproducibility: 10 (Always present)
- Exploitability: 1 (N/A)
- Affected Users: 5 (Indirect)
- Discoverability: 9 (Obvious gap)
- **Total: 6.4 (MEDIUM)**

**Existing Mitigation:**
- Pino structured logging
- Logger configured with requestId

**Required Mitigation:**
- Add event provenance metadata:
  - Producer identity
  - Source system
  - Ingestion timestamp
  - Schema version
  - Chain of custody
- Implement event signing
- Use immutable event logs
- Add cryptographic linking (hash chains)
- Store audit trail in separate system

**SOC 2 Mapping:** CC4.1, CC7.3, PI1.3

**Gap Status:** ⚠️ PARTIAL - Logging exists but not comprehensive

---

#### Threat 3.2: Non-Repudiable Replay Actions
**Description:** Replay operations not properly audited
**Attack Vector:** Replay without audit trail
**DREAD Score:**
- Damage: 6 (Operational impact)
- Reproducibility: 10 (Always)
- Exploitability: 1 (N/A)
- Affected Users: 5 (Operations)
- Discoverability: 8 (Obvious)
- **Total: 6.0 (MEDIUM)**

**Existing Mitigation:**
- Logger configured for replay endpoint

**Required Mitigation:**
- Log all replay operations:
  - User/service identity
  - Replay parameters
  - Affected topics/partitions
  - Time range
  - Number of events replayed
  - Outcome
- Implement tamper-evident logs
- Send to SIEM
- Add approval workflow logging

**SOC 2 Mapping:** CC7.3, A1.2

**Gap Status:** ⚠️ PARTIAL - Basic logging, needs enhancement

---

### I - Information Disclosure

#### Threat 4.1: Sensitive Data in Kafka Topics
**Description:** PII or secrets exposed in event payloads
**Attack Vector:** Unencrypted sensitive data in Kafka
**DREAD Score:**
- Damage: 10 (Privacy breach)
- Reproducibility: 10 (If present)
- Exploitability: 6 (Requires access)
- Affected Users: 10 (Data subjects)
- Discoverability: 8 (Common issue)
- **Total: 8.8 (CRITICAL)**

**Existing Mitigation:**
- None identified

**Required Mitigation:**
- Implement data classification
- Add PII detection and redaction
- Use field-level encryption for sensitive data
- Implement data masking
- Add encryption at rest in Kafka
- Regular PII scanning
- Use tokenization for sensitive fields

**SOC 2 Mapping:** P3.1, P4.1, C1.1, C1.2

**Gap Status:** 🔴 CRITICAL GAP - No PII protection

---

#### Threat 4.2: Database Credential Exposure
**Description:** PostgreSQL connection string in environment/logs
**Attack Vector:** Environment variable leakage
**DREAD Score:**
- Damage: 10 (DB compromise)
- Reproducibility: 7 (If leaked)
- Exploitability: 9 (Direct access)
- Affected Users: 10 (All data)
- Discoverability: 8 (Common issue)
- **Total: 8.8 (CRITICAL)**

**Existing Mitigation:**
- Environment variable: `DATABASE_URL`

**Required Mitigation:**
- Use secrets management (HashiCorp Vault, AWS Secrets Manager)
- Implement credential rotation
- Use IAM database authentication
- Never log credentials
- Implement least privilege DB users
- Add secrets scanning in CI/CD
- Encrypt environment files

**SOC 2 Mapping:** CC6.1, C1.1

**Gap Status:** ⚠️ PARTIAL - Env var used, needs secrets manager

---

#### Threat 4.3: Checkpoint Information Disclosure
**Description:** Checkpoint data reveals system internals
**Attack Vector:** Public checkpoint endpoint without authentication
**DREAD Score:**
- Damage: 5 (Information leakage)
- Reproducibility: 10 (Always accessible)
- Exploitability: 10 (No auth)
- Affected Users: 10 (All)
- Discoverability: 10 (Public endpoint)
- **Total: 9.0 (CRITICAL)**

**Existing Mitigation:**
- None (GET /checkpoint/:id is unauthenticated)

**Required Mitigation:**
- Implement authentication on all endpoints
- Add authorization checks
- Sanitize error messages
- Limit checkpoint metadata exposure
- Implement rate limiting

**SOC 2 Mapping:** C1.1, CC6.6

**Gap Status:** 🔴 CRITICAL GAP - No authentication

---

### D - Denial of Service

#### Threat 5.1: Message Flood Attack
**Description:** Excessive messages overwhelm ingest pipeline
**Attack Vector:** High-volume malicious event production
**DREAD Score:**
- Damage: 9 (Service outage)
- Reproducibility: 9 (Easy to generate)
- Exploitability: 8 (Simple attack)
- Affected Users: 10 (All users)
- Discoverability: 9 (Obvious)
- **Total: 9.0 (CRITICAL)**

**Existing Mitigation:**
- Batch mode with batch size limit: `batchSize: 100`

**Required Mitigation:**
- Implement producer rate limiting
- Add topic-level quotas
- Use Kafka throttling
- Implement backpressure handling
- Add circuit breakers
- Monitor ingestion rates
- Implement priority queuing
- Add auto-scaling based on load

**SOC 2 Mapping:** A1.1, A1.2

**Gap Status:** ⚠️ PARTIAL - Batch size helps but no rate limiting

---

#### Threat 5.2: Database Exhaustion
**Description:** Event storage fills PostgreSQL database
**Attack Vector:** Continuous high-volume ingestion
**DREAD Score:**
- Damage: 9 (Service failure)
- Reproducibility: 8 (Sustained load)
- Exploitability: 7 (Requires volume)
- Affected Users: 10 (All users)
- Discoverability: 8 (Common issue)
- **Total: 8.4 (CRITICAL)**

**Existing Mitigation:**
- None identified

**Required Mitigation:**
- Implement data retention policies
- Add automatic archival
- Use partitioning for event tables
- Implement compression
- Add storage monitoring and alerts
- Implement TTL for old events
- Use tiered storage (hot/cold)

**SOC 2 Mapping:** A1.1, A1.2

**Gap Status:** 🔴 CRITICAL GAP - No retention policy

---

#### Threat 5.3: Replay Amplification Attack
**Description:** Large replay requests exhaust resources
**Attack Vector:** Replay of millions of events
**DREAD Score:**
- Damage: 8 (Performance impact)
- Reproducibility: 9 (Easy to trigger)
- Exploitability: 8 (Simple API call)
- Affected Users: 10 (All consumers)
- Discoverability: 9 (Obvious)
- **Total: 8.8 (CRITICAL)**

**Existing Mitigation:**
- None identified

**Required Mitigation:**
- Implement replay size limits
- Add time-based rate limiting for replay
- Require approval for large replays
- Implement replay scheduling
- Add replay impact estimation
- Monitor replay resource usage
- Implement progressive replay (chunking)

**SOC 2 Mapping:** A1.1, A1.2

**Gap Status:** 🔴 CRITICAL GAP - No replay limits

---

### E - Elevation of Privilege

#### Threat 6.1: Consumer Group Hijacking
**Description:** Malicious consumer joins legitimate consumer group
**Attack Vector:** Unauthenticated Kafka consumer with same group ID
**DREAD Score:**
- Damage: 9 (Data theft/loss)
- Reproducibility: 7 (If Kafka accessible)
- Exploitability: 6 (Requires access)
- Affected Users: 10 (All events)
- Discoverability: 7 (Known attack)
- **Total: 7.8 (HIGH)**

**Existing Mitigation:**
- Consumer group ID: `streaming-ingest`

**Required Mitigation:**
- Implement Kafka ACLs for consumer groups
- Use consumer authentication
- Monitor for unexpected consumers
- Implement consumer allowlisting
- Add consumer health checks
- Use unique consumer IDs per instance

**SOC 2 Mapping:** CC6.2, CC6.3

**Gap Status:** 🔴 CRITICAL GAP - No consumer authentication

---

#### Threat 6.2: Checkpoint Manipulation for Replay Attack
**Description:** Modified checkpoints cause event re-processing
**Attack Vector:** Unauthorized checkpoint updates
**DREAD Score:**
- Damage: 8 (Duplicate processing)
- Reproducibility: 9 (Easy to call)
- Exploitability: 8 (No auth)
- Affected Users: 10 (All consumers)
- Discoverability: 9 (Public endpoint)
- **Total: 8.8 (CRITICAL)**

**Existing Mitigation:**
- Basic validation of checkpoint parameters

**Required Mitigation:**
- Implement authorization for checkpoint operations
- Add checkpoint integrity validation
- Use cryptographic checksums
- Implement checkpoint versioning
- Add checkpoint audit trail
- Limit checkpoint modification to authorized services

**SOC 2 Mapping:** CC6.2, PI1.2

**Gap Status:** 🔴 CRITICAL GAP - No authorization

---

## Supply Chain Security Threats

### Threat 7.1: Dependency Vulnerabilities
**Description:** Vulnerable npm packages compromise service
**Attack Vector:** Known CVEs in dependencies
**DREAD Score:**
- Damage: 9 (Code execution)
- Reproducibility: 8 (If vulnerable)
- Exploitability: 7 (Exploits available)
- Affected Users: 10 (All users)
- Discoverability: 9 (Public CVEs)
- **Total: 8.6 (CRITICAL)**

**Existing Mitigation:**
- None visible in code

**Required Mitigation:**
- Implement automated dependency scanning (Snyk, Dependabot)
- Regular dependency updates
- Use lock files (pnpm-lock.yaml)
- Implement SCA in CI/CD
- Monitor for new vulnerabilities
- Use minimal dependencies

**SOC 2 Mapping:** CC7.2, CC8.1

**Gap Status:** ⚠️ PARTIAL - Need automated scanning

---

### Threat 7.2: Compromised Kafka Connector
**Description:** Malicious Kafka client library
**Attack Vector:** Supply chain attack on kafka-node or similar
**DREAD Score:**
- Damage: 10 (Full compromise)
- Reproducibility: 2 (Rare)
- Exploitability: 9 (If compromised)
- Affected Users: 10 (All users)
- Discoverability: 3 (Hard to detect)
- **Total: 6.8 (HIGH)**

**Existing Mitigation:**
- Lock file ensures version consistency

**Required Mitigation:**
- Verify package signatures
- Use private npm registry
- Implement SBOM generation
- Regular dependency audits
- Monitor for suspicious package updates
- Use subresource integrity

**SOC 2 Mapping:** CC7.2, CC8.1

**Gap Status:** ⚠️ PARTIAL - Lock file exists, need signature verification

---

## Summary of Findings

### Critical Gaps (Immediate Action Required)
1. **No Kafka authentication** - Unauthorized producers/consumers
2. **No API authentication** - Unrestricted replay/checkpoint access
3. **No input validation** - Data poisoning vulnerability
4. **PII exposure risk** - No data protection
5. **Database credential exposure** - Secrets in environment
6. **No rate limiting** - DoS vulnerability
7. **No retention policy** - Storage exhaustion
8. **No replay limits** - Amplification attacks
9. **Checkpoint manipulation** - Integrity risk

### High Priority Gaps
1. Message tampering possible
2. Consumer group hijacking
3. Insufficient provenance tracking
4. Dependency vulnerabilities

### Medium Priority Gaps
1. Enhanced audit logging needed
2. Replay audit trail incomplete
3. Supply chain security gaps

### Compliance Impact
- **SOC 2 Security:** 9 critical authentication/authorization gaps
- **SOC 2 Availability:** 3 critical DoS vulnerabilities
- **SOC 2 Confidentiality:** 2 critical data exposure risks
- **SOC 2 Privacy:** 1 critical PII protection gap
- **SOC 2 Processing Integrity:** 3 data integrity risks

---

## Recommendations

### Immediate Actions (Week 1)
1. Implement Kafka SASL authentication
2. Add API authentication (JWT)
3. Implement event schema validation
4. Move database credentials to secrets manager
5. Add rate limiting on APIs and Kafka

### Short-term Actions (Month 1)
1. Implement data retention policies
2. Add PII detection and encryption
3. Implement replay size limits
4. Add comprehensive audit logging
5. Implement Kafka ACLs
6. Add event provenance metadata

### Long-term Actions (Quarter 1)
1. Implement end-to-end encryption
2. Add automated dependency scanning
3. Regular security audits
4. Penetration testing
5. Implement SBOM generation
6. Add event signing and verification

### Operational Security
1. Monitor ingestion rates and anomalies
2. Implement automated alerting
3. Regular capacity planning
4. Disaster recovery testing
5. Incident response procedures

---

## Approval and Sign-off

**Reviewed By:** _____________________
**Date:** _____________________
**Next Review:** 2026-03-27 (Quarterly)
