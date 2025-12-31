# Agent Provenance & Replayability

To ensure full accountability and debuggability, every agent run generates a complete provenance trail that allows for "Replay Mode".

## 1. Provenance Data Model

For every `MaestroRun` of kind `agent`, we store a `ProvenanceTrace`:

```typescript
interface ProvenanceTrace {
  runId: string;
  agentId: string;
  templateVersion: number;
  configSnapshot: Record<string, any>;
  steps: ProvenanceStep[];
  receipt: string; // Hash of the final state
}

interface ProvenanceStep {
  stepId: number;
  timestamp: string;
  action: string;
  input: any;
  policyDecision: {
    allowed: boolean;
    reason: string;
  };
  output: any;
  sideEffects?: string[]; // e.g., "Updated Ticket #123"
  usage: {
    tokens: number;
    durationMs: number;
  };
}
```

## 2. Replay Mode

Replay mode allows an operator to re-execute an agent run to verify logic or debug failures without incurring new costs or side effects.

**Mechanism:**
1.  **Mocking:** All external calls (HTTP, DB writes) are mocked using the `output` recorded in the `ProvenanceTrace`.
2.  **Deterministic Execution:** The LLM responses are injected from the trace (cached).
3.  **Verification:** The replay asserts that the agent logic produces the same next step given the same inputs.

## 3. Storage

*   **Hot Storage:** Traces are stored in PostgreSQL/Neo4j for 30 days.
*   **Cold Storage:** Archived to S3/Blob Storage after 30 days.
*   **Immutable Ledger:** The `traceId` and `receiptHash` are committed to the `ProvenanceLedger`.

## 4. Auditability

The `ProvenanceExplorer` UI allows auditors to:
*   Visualize the decision tree.
*   See exactly why a policy allowed or denied an action.
*   Trace the cost of a specific run.
