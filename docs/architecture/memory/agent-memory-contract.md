# Summit Agent Memory Contract (LangChain-Aligned, Governance-Hardened)

## Summit Readiness Assertion
This design operationalizes memory as governed, reviewable artifacts with deterministic policy controls and reversible changes. It aligns with the readiness requirement that all agent behavior be explainable, auditable, and enforceable via policy-as-code.

## 1) Mapping LangChain Agent Builder Memory to Summit

Summit adopts the LangChain file-first memory pattern and binds each memory class to an explicit Summit subsystem.

| LangChain pattern | Summit layer | Canonical storage | Runtime role |
| --- | --- | --- | --- |
| Procedural memory (`AGENTS.md`, `tools.json`) | Agent contract and tool authority | `cases/*/AGENTS.md`, `agents/*/AGENTS.md`, scoped `tools.json` | Defines non-negotiable behavior and allowed tools |
| Semantic memory (skills + docs) | Knowledge and reusable playbooks | `skills/*.md`, `knowledge/facts.yml`, vector index references | Supplies contextually relevant knowledge |
| Episodic memory (planned conversation files) | Immutable run traces + compact summaries | `episodes/*.jsonl`, `episodes/*_summary.md` | Recalls prior outcomes and proven workflows |
| Tiered memory (planned user/org levels) | Access-scoped memory governance | `org/`, `users/`, `cases/`, `agents/` | Enforces least privilege and separation of concerns |

### Canonical memory tiers
1. **Org tier**: signed policies, curated skills, canonical lexicon.
2. **User tier**: preferences and constrained personalization.
3. **Case tier**: mission-specific instructions, sources, facts, hypotheses, and episodes.
4. **Agent tier**: runtime specialization and bounded local notes.

## 2) Concrete Memory Schema

### 2.1 Filesystem contract

```text
/summit_memory/
  /org/
    policies/
    skills/
    lexicon/
  /users/{user_id}/
    preferences.md
    redaction_rules.yml
    shortcuts.md
  /cases/{case_id}/
    AGENTS.md
    tools.json
    sources/source_registry.yml
    skills/
    knowledge/facts.yml
    knowledge/hypotheses.md
    episodes/
    artifacts/
  /agents/{agent_id}/
    AGENTS.md
    skills/
    notes.md
```

### 2.2 Schema-governed artifacts
- `schemas/memory/skill-frontmatter.schema.json` validates skill metadata.
- `schemas/memory/memory-proposal.schema.json` validates memory write proposals.
- `schemas/memory/episode.schema.json` validates append-only episodic records.

### 2.3 Retrieval composition contract
At execution time, the context compiler composes:
1. Procedural memory (case + agent `AGENTS.md`, policy snippets).
2. Tool constraints (`tools.json` for current scope only).
3. Semantic memory (top-k approved skills and facts for objective).
4. Episodic memory (latest summaries + matching golden episodes).

## 3) Memory Safety Threat Model (OSINT Grade)

### MAESTRO layers
- **Agents**: instruction-following and delegation behavior.
- **Tools**: scoped tool execution and call mediation.
- **Data**: memory storage integrity and provenance.
- **Security**: policy enforcement, trust tiers, rollback.
- **Observability**: tamper-evident logs and decision traceability.

### Threats considered
1. Persistent memory poisoning via malicious write suggestions.
2. Summarization injection during compaction/reflection.
3. Episode imitation attacks (unsafe pattern replay).
4. Cross-agent privilege escalation through memory/tool indirection.

### Required controls
1. **Proposal-only writes**: agents can propose, not directly mutate high-trust memory.
2. **Tiered approvals**: org/case writes require human approval; user-tier changes may auto-accept under policy.
3. **Provenance-gated facts**: fact stores require `source_id`, quote pointer, timestamp, confidence.
4. **Policy-checked compaction**: background reflection jobs produce diff artifacts and policy verdicts.
5. **Explicit `/remember` flow**: always audited, always reversible, never bypasses tier approvals.
6. **Untrusted retrieval discipline**: retrieved memory never overrides system/policy authority.
7. **Red-team gate**: include multi-turn and delayed-trigger injection cases in CI adversarial suites.

## 4) Comparative Pattern Assessment

| Capability | LangChain Agent Builder | OpenPlanter | AutoDev | Summit target posture |
| --- | --- | --- | --- | --- |
| Primary memory abstraction | File-based memory contract | Durable workspace/session persistence | Repo/log/tool-context loop | Hybrid contract + workspace + trace memory |
| Procedural memory | Strong (`AGENTS.md`, `tools.json`) | Implicit via workspace conventions | Implicit via repo/runtime config | Strong and policy-enforced |
| Episodic memory | Planned (conversation files) | Session resume artifacts | Build/test trace continuity | Append-only signed episodes + compaction |
| Safety baseline | Human-in-loop memory edits | Session controls; less explicit tier governance | Sandbox + command controls | Tiered trust + policy-as-code + provenance |
| Retrieval strategy | Emerging semantic search + `/remember` | File-centric contextual recall | Execution-centric context reuse | Composed retrieval across policy/semantic/episode tiers |

## 5) Rollout Phases
1. **Phase 1: Memory contract foundations**
   - Land schemas, directory conventions, proposal workflow.
2. **Phase 2: Reflection workflows**
   - Add `/remember`, compaction jobs, and diff approval queue.
3. **Phase 3: Episodic hardening**
   - Signed append-only episodes with golden-pattern retrieval.
4. **Phase 4: Tiered semantic retrieval**
   - User/org/case tier selectors with approved-memory-only search.

## Rollback posture
All memory mutations are revertible by replaying proposal logs and restoring prior signed snapshots for affected tier paths.
