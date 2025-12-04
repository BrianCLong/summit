# Prompt #11: Runbook Runner + Provers - Auditable Autonomy (Core GA)

**Target**: Core GA Q4 2025
**Owner**: Automation/AI team
**Depends on**: Agent runtime, Provenance ledger, Policy engine

---

## Pre-Flight Checklist

```bash
# ✅ Check agent infrastructure
ls -la services/agent-runtime/
ls -la services/agents/

# ✅ Verify runbook examples
find . -name "*runbook*" -o -name "*.pcq" | head -10

# ✅ Check provenance capabilities
grep -r "attestation\|proof\|prover" services/*/src/
```

---

## Claude Prompt

```
You are implementing the Runbook Runner with Proof-Carrying Analytics for IntelGraph Core GA.

CONTEXT:
- Stack: Node.js or Python, Neo4j, OPA (policy engine)
- Existing: services/agent-runtime/ (may exist)
- Use case: Automated analysis workflows with auditable proofs
- Frontend: apps/web/src/components/

REQUIREMENTS:
Build an agentic runbook runner with machine-checkable proofs:

1. **Deterministic DAG Runner**:
   - Runbook: Directed Acyclic Graph (DAG) of analysis steps
   - Step types: query, transform, aggregate, export, notify
   - Execution: Topological sort → Execute nodes in order
   - Parallelization: Execute independent steps concurrently
   - Retry: Configurable retry policy (max 3 attempts, exponential backoff)
   - Idempotent: Re-running same runbook produces same result (given same inputs)

2. **Per-Node Attestation**:
   - Each step: Generate attestation after execution
   - Attestation: {stepId, inputs, outputs, timestamp, signature, proofs[]}
   - Signature: Sign attestation with service key (Ed25519)
   - Chain: Each step references previous step's attestation
   - Audit: Immutable record of entire runbook execution

3. **Export *.pcq Manifests (Proof-Carrying Queries)**:
   - Format: JSON manifest with proofs
   - Structure:
     - runbookId, version, executedAt, executedBy
     - steps[]: [{stepId, attestation, inputs, outputs, proofs}]
     - merkleRoot: Root of attestation tree
     - signature: Sign entire manifest
   - External verification: Standalone tool validates proofs

4. **Runbook Provers (Preconditions & Postconditions)**:
   - Precondition prover: Check before step execution
     - Example: "User has authority X" (query OPA)
     - Example: "License allows operation Y" (query license registry)
   - Postcondition prover: Check after step execution
     - Example: "Output has ≥N citations" (count sources)
     - Example: "KPI Z met" (assert metric threshold)
   - Failing prover: Block export, raise ombuds review

5. **Sample Runbooks**:
   - R1 (Entity Enrichment):
     1. Query entities with missing fields
     2. Fetch external data (API call)
     3. Update entities in Neo4j
     4. Assert: All entities now have required fields
   - R2 (Relationship Inference):
     1. Find entity pairs with high co-occurrence
     2. Score relationships (ML model)
     3. Create inferred edges (INFERRED_RELATIONSHIP)
     4. Assert: Confidence scores logged, provenance recorded
   - R3 (Weekly Report):
     1. Aggregate: New entities, relationships this week
     2. Generate: Summary statistics
     3. Export: PDF report
     4. Notify: Email to stakeholders
     5. Assert: Report contains ≥1 citation per claim

6. **Replay & Determinism**:
   - Given: Same runbook + same inputs
   - Result: Identical outputs (deterministic execution)
   - Replay: Re-run historical runbook → Verify same result
   - Use: Audit, debugging, compliance verification

7. **Ombuds Review on Failure**:
   - If prover fails: Block export, create review ticket
   - Ticket: {runbookId, failedStep, failedProver, reason, assignedTo}
   - Escalation: Email ombuds team, Slack notification
   - Manual review: Ombuds approves/rejects runbook result

8. **UI: Runbook Console**:
   - apps/web/src/components/runbooks/RunbookConsole.tsx
   - Features:
     - List runbooks (templates)
     - Execute runbook (with params)
     - View execution: Step-by-step progress
     - Replay: Select historical execution → Replay
     - Export: Download *.pcq manifest

DELIVERABLES:

1. services/runbooks/
   - Framework: Node.js (preferred for DAG execution) or Python
   - Routes:
     - POST /runbooks/execute (start execution)
     - GET /runbooks/{executionId} (status)
     - GET /runbooks/{executionId}/replay (replay)
     - GET /runbooks/{executionId}/manifest.pcq (download proof)

2. services/runbooks/src/runner.ts (or .py)
   - export class RunbookRunner
   - Methods: execute(runbook, inputs), getStatus(executionId), replay(executionId)
   - DAG execution: Topological sort, parallel execution

3. services/runbooks/src/attestation.ts (or .py)
   - export class AttestationManager
   - Methods: createAttestation(step, result), signAttestation(attestation, key)
   - Chain: Link attestations (previousAttestationHash)

4. services/runbooks/src/provers/precondition-prover.ts (or .py)
   - export class PreconditionProver
   - Methods: checkAuthority(user, authority), checkLicense(resource, operation)
   - Integration: Query OPA, license registry

5. services/runbooks/src/provers/postcondition-prover.ts (or .py)
   - export class PostconditionProver
   - Methods: assertCitations(output, minCount), assertKPI(metric, threshold)
   - Fail: Raise ProverFailedError → Block export

6. services/runbooks/src/manifest.ts (or .py)
   - export class PCQManifestBuilder
   - Methods: build(executionId), exportToFile(manifest, path)
   - Format: JSON with attestations, Merkle tree, signature

7. services/runbooks/templates/
   - R1-entity-enrichment.json (runbook definition)
   - R2-relationship-inference.json
   - R3-weekly-report.json

8. apps/web/src/components/runbooks/RunbookConsole.tsx
   - UI: List runbooks → Select → Execute with params
   - Progress: Step-by-step execution status (pending, running, done, failed)
   - Logs: Show step outputs, attestations

9. apps/web/src/components/runbooks/RunbookReplay.tsx
   - Select historical execution → Replay → Compare results
   - Diff view: Original vs. Replayed outputs (should be identical)

10. apps/web/src/components/runbooks/OmbudsReviewQueue.tsx
    - Table: Failed runbook executions
    - Columns: Runbook, Failed Step, Prover, Reason, Actions
    - Actions: Approve (override), Reject, Request More Info

11. tools/pcq-verify/
    - CLI tool: Verify *.pcq manifest
    - Usage: pcq-verify --manifest runbook-123.pcq
    - Checks: Signatures, Merkle tree, attestation chain
    - Output: "✅ Proofs verified" or "❌ Verification failed"

12. Tests:
    - services/runbooks/tests/test_runner.py (or .test.ts)
    - services/runbooks/tests/test_attestation.py
    - services/runbooks/tests/test_provers.py
    - Integration: Execute R1 → Verify determinism (replay 3x, same result)

ACCEPTANCE CRITERIA:
✅ Replay determinism: Same runbook + inputs → Identical outputs (10/10 tests)
✅ Failing prover blocks export and raises ombuds review
✅ *.pcq manifest validates with pcq-verify tool
✅ Per-node attestations signed and chained
✅ UI shows step-through execution with replay capability

TECHNICAL CONSTRAINTS:
- DAG execution: Use topological sort (Kahn's algorithm or DFS)
- Determinism: Control randomness (fixed seeds), timestamps (use input time)
- Signature: Ed25519 for attestations
- Manifest format: JSON with JSON Schema validation
- Provers: Fail-fast (don't continue if precondition fails)
- Retry: Exponential backoff (2s, 4s, 8s), max 3 attempts

SAMPLE RUNBOOK DEFINITION (R1-entity-enrichment.json):
```json
{
  "runbookId": "R1",
  "name": "Entity Enrichment",
  "version": "1.0",
  "steps": [
    {
      "stepId": "query-entities",
      "type": "query",
      "description": "Find entities with missing fields",
      "cypher": "MATCH (e:Entity) WHERE e.email IS NULL RETURN e",
      "preconditions": ["authority:read_entities"]
    },
    {
      "stepId": "fetch-external-data",
      "type": "external_api",
      "description": "Fetch data from external API",
      "endpoint": "https://api.example.com/enrich",
      "method": "POST",
      "preconditions": ["license:api_access"]
    },
    {
      "stepId": "update-entities",
      "type": "mutation",
      "description": "Update entities in Neo4j",
      "cypher": "MATCH (e:Entity {id: $id}) SET e.email = $email",
      "preconditions": ["authority:write_entities"]
    },
    {
      "stepId": "assert-completeness",
      "type": "assertion",
      "description": "All entities now have required fields",
      "postconditions": ["kpi:completeness>=0.95"]
    }
  ],
  "provers": {
    "preconditions": {
      "authority:read_entities": {
        "type": "opa",
        "policy": "intelgraph.allow",
        "input": {"action": "read", "resource": "entity"}
      },
      "license:api_access": {
        "type": "license_registry",
        "check": "api.example.com allows enrichment"
      }
    },
    "postconditions": {
      "kpi:completeness>=0.95": {
        "type": "metric",
        "query": "MATCH (e:Entity) RETURN count(e) as total, count(e.email) as complete",
        "assertion": "complete / total >= 0.95"
      }
    }
  }
}
```

SAMPLE *.PCQ MANIFEST:
```json
{
  "manifestId": "pcq-123",
  "runbookId": "R1",
  "version": "1.0",
  "executedAt": "2025-11-29T10:00:00Z",
  "executedBy": "agent-456",
  "steps": [
    {
      "stepId": "query-entities",
      "attestation": {
        "inputs": {},
        "outputs": [{"id": "e1", "name": "Alice"}, {"id": "e2", "name": "Bob"}],
        "timestamp": "2025-11-29T10:00:05Z",
        "signature": "base64:...",
        "previousAttestationHash": null
      },
      "proofs": {
        "preconditions": [
          {"prover": "authority:read_entities", "result": "pass", "evidence": "OPA policy allowed"}
        ]
      }
    },
    {
      "stepId": "fetch-external-data",
      "attestation": {
        "inputs": [{"id": "e1"}, {"id": "e2"}],
        "outputs": [{"id": "e1", "email": "alice@example.com"}, {"id": "e2", "email": "bob@example.com"}],
        "timestamp": "2025-11-29T10:00:10Z",
        "signature": "base64:...",
        "previousAttestationHash": "sha256:abc123..."
      },
      "proofs": {
        "preconditions": [
          {"prover": "license:api_access", "result": "pass", "evidence": "License allows API calls"}
        ]
      }
    },
    {
      "stepId": "update-entities",
      "attestation": {
        "inputs": [{"id": "e1", "email": "alice@example.com"}, {"id": "e2", "email": "bob@example.com"}],
        "outputs": {"updated": 2},
        "timestamp": "2025-11-29T10:00:15Z",
        "signature": "base64:...",
        "previousAttestationHash": "sha256:def456..."
      },
      "proofs": {
        "preconditions": [
          {"prover": "authority:write_entities", "result": "pass", "evidence": "OPA policy allowed"}
        ]
      }
    },
    {
      "stepId": "assert-completeness",
      "attestation": {
        "inputs": {},
        "outputs": {"completeness": 0.97},
        "timestamp": "2025-11-29T10:00:20Z",
        "signature": "base64:...",
        "previousAttestationHash": "sha256:ghi789..."
      },
      "proofs": {
        "postconditions": [
          {"prover": "kpi:completeness>=0.95", "result": "pass", "evidence": "97% complete"}
        ]
      }
    }
  ],
  "merkleRoot": "sha256:jkl012...",
  "signature": "base64:..."
}
```

SAMPLE RUNBOOK CONSOLE UI (RunbookConsole.tsx):
```tsx
import React, { useState } from 'react';

export function RunbookConsole() {
  const [selectedRunbook, setSelectedRunbook] = useState<string | null>(null);
  const [execution, setExecution] = useState<any>(null);

  const runbooks = ['R1-entity-enrichment', 'R2-relationship-inference', 'R3-weekly-report'];

  const executeRunbook = async (runbookId: string) => {
    const res = await fetch('/api/runbooks/execute', {
      method: 'POST',
      body: JSON.stringify({ runbookId, inputs: {} }),
    });
    const data = await res.json();
    setExecution(data);
  };

  return (
    <div>
      <h2>Runbook Console</h2>
      <select onChange={(e) => setSelectedRunbook(e.target.value)}>
        <option>Select runbook</option>
        {runbooks.map((r) => <option key={r} value={r}>{r}</option>)}
      </select>
      <button onClick={() => executeRunbook(selectedRunbook!)}>Execute</button>

      {execution && (
        <div>
          <h3>Execution: {execution.executionId}</h3>
          {execution.steps.map((step: any) => (
            <div key={step.stepId} style={{ border: '1px solid gray', margin: '5px', padding: '10px' }}>
              <p><strong>{step.stepId}</strong>: {step.status}</p>
              {step.status === 'done' && <p>✅ Attestation signed</p>}
              {step.status === 'failed' && <p>❌ Prover failed: {step.error}</p>}
            </div>
          ))}
          <button onClick={() => window.location.href = `/api/runbooks/${execution.executionId}/manifest.pcq`}>
            Download *.pcq Manifest
          </button>
        </div>
      )}
    </div>
  );
}
```

OUTPUT:
Provide:
(a) Runbook service (Node.js or Python)
(b) DAG runner with topological sort
(c) Attestation manager (sign & chain)
(d) Precondition & postcondition provers
(e) *.pcq manifest builder
(f) React components (RunbookConsole, OmbudsReviewQueue)
(g) CLI verifier tool (pcq-verify)
(h) Sample runbooks (R1, R2, R3)
(i) Tests (determinism, prover failures)
```

---

## Success Metrics

- [ ] Replay determinism: 10/10 runbooks produce identical outputs
- [ ] Failing prover blocks export (0 exports with failed proofs)
- [ ] *.pcq manifests validate with pcq-verify
- [ ] Ombuds queue shows failed runbooks
- [ ] UI shows step-through + replay capability

---

## Follow-Up Prompts

1. **Distributed execution**: Run steps across multiple workers
2. **Conditional branching**: If/else steps based on outputs
3. **Human-in-the-loop**: Pause for manual approval mid-runbook

---

## References

- Proof-carrying code: https://en.wikipedia.org/wiki/Proof-carrying_code
- DAG execution: https://en.wikipedia.org/wiki/Topological_sorting
- Ed25519: https://github.com/paulmillr/noble-ed25519
