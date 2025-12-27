# Threat Model: Data Subsystem

> **Version**: 1.0
> **Last Updated**: 2025-12-27
> **Status**: Production
> **Owner**: Security Architecture Team
> **SOC 2 Controls**: CC6.1, PI1.1, PI1.4, C1.1, C1.2

## 1. System Overview

The Data Subsystem manages persistent storage across Neo4j (graph), PostgreSQL (relational), and Redis (cache).

### Components

- **Neo4j**: Graph database for entities and relationships
- **PostgreSQL**: Relational storage for audit, users, tenants
- **Redis**: Caching, session storage, rate limiting
- **TimescaleDB**: Time-series analytics data

### Data Assets

- Entity graph data (TS/SCI classification support)
- User credentials and sessions
- Audit logs (immutable)
- Provenance chains
- Encryption keys

---

## 2. Threat Catalog

### THREAT-DATA-001: SQL Injection

**Description**: Attacker injects SQL via application inputs.

**STRIDE Category**: Tampering, Information Disclosure

**Risk Level**: CRITICAL

**Mitigations**:
| Control | Implementation | Status |
|---------|----------------|--------|
| Parameterized Queries | All queries use prepared statements | ✅ Implemented |
| ORM Usage | Prisma with query building | ✅ Implemented |
| Input Validation | Zod validation before DB operations | ✅ Implemented |

**Residual Risk**: LOW

---

### THREAT-DATA-002: Neo4j Cypher Injection

**Description**: Attacker injects Cypher queries to access unauthorized graph data.

**STRIDE Category**: Information Disclosure, Tampering

**Risk Level**: CRITICAL

**Mitigations**:
| Control | Implementation | Status |
|---------|----------------|--------|
| Cypher Sandbox | Whitelist allowed operations | ✅ Implemented |
| Parameterized Cypher | Use $params in all queries | ✅ Implemented |
| Query Validation | Validate query structure before execution | ✅ Implemented |
| Read-Only for Search | Use read replicas for search queries | ✅ Implemented |

**Residual Risk**: LOW

---

### THREAT-DATA-003: Data Exfiltration via Backup

**Description**: Attacker gains access to database backups containing sensitive data.

**STRIDE Category**: Information Disclosure

**Risk Level**: HIGH

**Mitigations**:
| Control | Implementation | Status |
|---------|----------------|--------|
| Backup Encryption | AES-256 encryption at rest | ✅ Implemented |
| Access Logging | All backup access logged | ✅ Implemented |
| Retention Limits | Automated backup rotation | ✅ Implemented |
| Separate Credentials | Backup credentials separate from app | ✅ Implemented |

**Residual Risk**: LOW

---

### THREAT-DATA-004: Redis Cache Poisoning

**Description**: Attacker injects malicious data into Redis cache.

**STRIDE Category**: Tampering

**Risk Level**: MEDIUM

**Mitigations**:
| Control | Implementation | Status |
|---------|----------------|--------|
| Authentication | Redis AUTH required | ✅ Implemented |
| TLS Encryption | In-transit encryption | ✅ Implemented |
| Serialization Validation | Validate deserialized objects | ✅ Implemented |
| Key Namespacing | Tenant isolation in keys | ✅ Implemented |

**Residual Risk**: LOW

---

### THREAT-DATA-005: Multi-Tenant Data Leakage

**Description**: Data from one tenant leaks to another due to isolation failure.

**STRIDE Category**: Information Disclosure

**Risk Level**: CRITICAL

**Mitigations**:
| Control | Implementation | Status |
|---------|----------------|--------|
| Tenant Context Middleware | All queries include tenant filter | ✅ Implemented |
| Row-Level Security | PostgreSQL RLS policies | ✅ Implemented |
| Graph Subgraph Isolation | Neo4j tenant labels on all nodes | ✅ Implemented |
| Cross-Tenant Query Detection | Alert on cross-tenant access attempts | ✅ Implemented |

**Residual Risk**: LOW

---

## 3. Security Controls Summary

| Control Category | Implemented | Planned | Total  |
| ---------------- | ----------- | ------- | ------ |
| Query Protection | 8           | 0       | 8      |
| Encryption       | 4           | 0       | 4      |
| Tenant Isolation | 4           | 0       | 4      |
| Access Control   | 4           | 0       | 4      |
| **TOTAL**        | **20**      | **0**   | **20** |

---

## 4. References

- [ARCHITECTURE.md](../docs/ga/ARCHITECTURE.md)
- [Neo4j Connection](../server/src/db/neo4jConnection.ts)
- [PostgreSQL Configuration](../server/src/db/postgres.ts)
