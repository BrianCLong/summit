# ADR-009: Context Provenance Graph (CPG) for Model Context Protocols

**Status:** Proposed
**Date:** 2026-01-01
**Author:** Summit Architecture Team

## Context

Summit's orchestrator compiles context from multiple sources (session events, artifacts, memories) before each model invocation. Currently:

- Context is treated as an **ephemeral blob** that exists only during compilation
- No cryptographic tracking of context **origin, derivation, or trust lineage**
- Policy enforcement happens at execution boundaries, not context boundaries
- **Audit trails cannot reconstruct** what context was actually presented to a model at time T
- **Revocation is impossible**: once context enters a session, it cannot be selectively invalidated

This creates critical gaps:

1. **Explainability deficit**: "Why did the model produce output X?" cannot be traced to specific context segments
2. **Security risk**: Poisoned or adversarial context cannot be surgically removed once introduced
3. **Compliance exposure**: Cannot prove what information was (or was not) provided to models
4. **Trust propagation failure**: Context from untrusted agents cannot be flagged and isolated

As Summit moves toward:
- Multi-agent collaboration (MCP servers, tool calls, nested sessions)
- High-stakes decision support (intelligence analysis, incident response)
- Regulatory environments requiring audit trails

We need **context itself to become a first-class governed object** with cryptographic provenance, versioning, and policy enforcement at token-range granularity.

## Decision

We will implement a **Context Provenance Graph (CPG)** system that:

### 1. Context Segmentation & Identification

- **Divide compiled context into addressable segments** before model invocation:
  - Instructions (system prompts)
  - Individual events (messages, tool calls, tool results)
  - Artifacts (loaded documents, code snippets)
  - Memory results (vector search hits)

- **Assign cryptographic identifiers** to each segment:
  ```typescript
  interface ContextSegment {
    id: string;              // SHA-256 hash of (content + metadata)
    type: 'instruction' | 'event' | 'artifact' | 'memory';
    content: string;
    metadata: {
      sourceAgentId?: string;
      trustTier: 'system' | 'verified' | 'user' | 'external';
      policyDomain: string;
      verificationStatus: 'signed' | 'unsigned' | 'revoked';
      timestamp: Date;
    };
  }
  ```

### 2. Provenance Graph Structure

- **Represent context relationships as a directed acyclic graph (DAG)**:
  - **Nodes**: ContextSegment instances
  - **Edges**: Derivation relationships (transformation, inclusion, agent-origin)

- **Edge types**:
  - `DERIVED_FROM`: Segment B was transformed from Segment A
  - `INCLUDES`: Compiled context includes this segment
  - `ORIGINATED_BY`: Segment was created by Agent X
  - `SUPERSEDES`: New segment replaces old (versioning)

- **Graph properties**:
  - Immutable once created (append-only)
  - Cryptographically linked (parent hashes included in child segments)
  - Queryable by session, agent, time range, trust tier

### 3. Policy Enforcement Engine

**Operate at MCP layer**, before model invocation:

```typescript
interface PolicyRule {
  id: string;
  condition: (segment: ContextSegment) => boolean;
  action: 'permit' | 'deny' | 'redact' | 'flag';
  justification: string;
}
```

**Actions**:
- **Permit**: Include segment in final context
- **Deny**: Block execution if segment present
- **Redact**: Replace content with `[REDACTED: policy domain X]`
- **Flag**: Include but mark for audit

**Enforcement points**:
- Pre-compilation: Filter segments before ContextCompiler assembles LLMRequest
- Runtime: Kill-switch integration for dynamic revocation

### 4. Revocation & Replay Capabilities

**Revocation**:
- Mark segment as `verificationStatus: 'revoked'`
- Propagate revocation transitively through graph (all descendants invalidated)
- Trigger re-compilation of affected sessions
- Create tombstone node in provenance graph (audit trail)

**Replay**:
- Reconstruct exact historical context from graph state at timestamp T
- Support "what-if" analysis: replay with different policy rules
- Generate audit reports: "Show all context segments from Agent X in Session Y"

### 5. Integration with Existing Summit Components

**Hooks into**:
- `agents/orchestrator/src/context/ContextCompiler.ts`: Add segmentation + graph construction
- `ga-graphai/packages/data-integrity/src/invariants/`: Reuse InvariantEngine for policy rules
- Verification gates: Policy enforcement as pre-execution gate
- Kill-switch controller: Revocation triggers

**New modules**:
- `agents/orchestrator/src/context/provenance/ProvenanceGraph.ts`
- `agents/orchestrator/src/context/provenance/ProvenanceNode.ts`
- `agents/orchestrator/src/context/provenance/PolicyEngine.ts`
- `agents/orchestrator/src/context/provenance/ReplayEngine.ts`

## Consequences

### Positive

- **Auditable AI reasoning**: Complete chain-of-custody for model inputs
- **Surgical revocation**: Remove compromised context without killing entire sessions
- **Trust-aware orchestration**: Policy enforcement based on context origin + trust tier
- **Compliance enablement**: Provable record of what models "saw" at decision time
- **Adversarial resistance**: Cryptographic integrity prevents context tampering
- **Replayable debugging**: Reconstruct historical model behavior for incident analysis

### Negative

- **Storage overhead**: Provenance graphs consume additional memory + persistence
- **Compilation latency**: Segmentation + graph construction adds pre-model overhead
- **Complexity**: Developers must reason about context lifecycle, not just data flow
- **Garbage collection**: Old provenance graphs require retention policies + cleanup

### Risks

- **Performance at scale**: Large sessions (>1000 events) may create unwieldy graphs
  - *Mitigation*: Compact old segments, summarize deep history
- **Policy explosion**: Too many rules create maintenance burden
  - *Mitigation*: Start with minimal policy set, expand based on real incidents
- **Revocation storms**: Invalidating a root segment could cascade to thousands of descendants
  - *Mitigation*: Require explicit confirmation for wide-impact revocations

## Alternatives Considered

### 1. Context Hashing Without Graph Structure
**Description**: Hash entire compiled context blob, store hash with session
**Rejected because**:
- Cannot trace individual segment origins
- Revocation impossible (all-or-nothing)
- No support for partial redaction

### 2. Append-Only Event Log (No Derivation Tracking)
**Description**: Log all context mutations as events, no relationships
**Rejected because**:
- Cannot answer "why was this segment included?"
- Replay requires re-executing entire compilation pipeline
- No transitive policy enforcement

### 3. Policy Enforcement at Execution Layer Only
**Description**: Current approach—check permissions before tool calls, not context assembly
**Rejected because**:
- Model already "saw" forbidden context by the time execution happens
- Cannot prevent prompt injection via poisoned context
- No protection against adversarial memory retrieval

### 4. Store Provenance in Neo4j Graph Database
**Description**: Leverage existing graph infrastructure
**Deferred for now because**:
- Adds dependency + network latency to critical path
- Context provenance is session-scoped, not global knowledge graph
- Future optimization: export to Neo4j for cross-session analysis

## Implementation Plan

### Phase 1: Core Provenance Infrastructure (Weeks 1-2)
- Implement `ProvenanceGraph` and `ProvenanceNode` data structures
- Add segmentation logic to `ContextCompiler`
- Create basic cryptographic identifier generation (SHA-256)
- Write unit tests for graph construction + traversal

### Phase 2: Policy Engine Integration (Weeks 3-4)
- Build `PolicyEngine` with permit/deny/redact actions
- Define initial policy rules:
  - Block segments from revoked agents
  - Redact segments with `trustTier: 'external'` in high-security sessions
  - Flag segments with `verificationStatus: 'unsigned'` for audit
- Integrate with existing verification gates

### Phase 3: Revocation & Replay (Weeks 5-6)
- Implement revocation API: `POST /sessions/:id/context/:segmentId/revoke`
- Build replay engine: `GET /sessions/:id/context/snapshot?timestamp=T`
- Add GraphQL queries for provenance exploration
- Create admin UI for visualizing provenance graphs

### Phase 4: Production Hardening (Weeks 7-8)
- Add persistence layer (SQLite for provenance graphs)
- Implement garbage collection for old graphs
- Performance optimization (batch segmentation, lazy graph construction)
- Security audit: verify cryptographic integrity guarantees
- Documentation + runbooks for operators

### Phase 5: Advanced Features (Future)
- Export to Neo4j for cross-session provenance analysis
- Machine learning on provenance patterns (anomaly detection)
- Provenance-aware context summarization (compress while preserving lineage)

## Open Questions

1. **Retention policy**: How long should provenance graphs be stored?
   - Proposal: 90 days for all sessions, indefinite for flagged/incident sessions

2. **Granularity**: Should we segment at token level or message level?
   - Decision: Start with message-level (simpler), refine to token-level if needed

3. **Cryptographic binding**: Should we sign segments with agent keys?
   - Proposal: Phase 2 feature—enables non-repudiation for multi-agent scenarios

4. **Performance budget**: What's acceptable overhead for segmentation?
   - Target: <50ms added latency for typical session (100 events, 5 artifacts)

5. **Policy override**: Who can bypass policy rules in emergency?
   - Proposal: Require multi-party approval (2 admins + audit log entry)

## References

- [Context as Compiled View Pattern](https://github.com/google/generative-ai-docs/blob/main/demos/palm/web/context-as-compiled-view/)
- [OpenAI Model Context Protocol Specification](https://spec.modelcontextprotocol.io/)
- [W3C PROV Data Model](https://www.w3.org/TR/prov-dm/) (provenance representation standard)
- Summit ADR-008: Simulation Overlay and Synthetic Data Policy (related trust model)
- Summit ADR-006: LBAC via API-Level Security Proxy (related policy enforcement pattern)

## Success Metrics

- **Audit completeness**: 100% of production model calls have provenance graphs
- **Revocation latency**: <5 seconds from revocation request to enforcement
- **Policy violation rate**: <1% false positives on redaction rules
- **Performance overhead**: <100ms added latency at p95
- **Operator adoption**: 80% of incident investigations query provenance graphs within 30 days
