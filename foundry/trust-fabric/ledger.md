# Trust Fabric: The Verifiable Provenance Ledger

The Trust Fabric is the architectural layer of the Autonomous Research Foundry that guarantees the integrity, reproducibility, and auditability of all scientific activities. Its core component is the Verifiable Provenance Ledger, a cryptographically secured, append-only log of all events and artifacts.

## 1. Core Principles

*   **Verifiability:** Every piece of data, every line of code, and every experimental result can be independently verified by its cryptographic hash.
*   **Immutability:** The history of the Foundry is immutable. Once an event is recorded in the ledger, it cannot be altered or deleted without breaking the cryptographic chain.
*   **Reproducibility:** Every experiment is perfectly reproducible. The ledger stores a complete, content-addressed manifest of all inputs, ensuring that an experiment can be re-run at any point in the future to produce the exact same result.
*   **Decentralized Trust:** The ledger is designed to be verifiable in a decentralized manner, allowing different Foundry instances or external auditors to confirm the integrity of a research project without relying on a central authority.

## 2. Ledger Architecture

The ledger is not a traditional database but a hash-chained log of `LedgerEvent` objects, conceptually similar to a private blockchain or a certificate transparency log.

### Content-Addressed Storage (CAS)

All artifacts (datasets, model weights, source code, container images) are not stored by name but by the cryptographic hash of their content (e.g., `sha256:deadbeef...`). This has two key benefits:
1.  **Integrity:** Any change to an artifact results in a new hash, automatically versioning it and preventing silent corruption.
2.  **Deduplication:** The same artifact stored multiple times only takes up space once.

All artifacts are stored in a Content-Addressable Storage system (e.g., IPFS, or an S3-compatible store with a custom content-addressing layer).

### The Ledger Event

Every action taken by an agent in the Council of Solvers, or by the system itself, is captured as a `LedgerEvent`.

```typescript
// Conceptual structure of a LedgerEvent
interface LedgerEvent {
  id: string; // Hash of the event's content
  parent_id: string; // Hash of the previous event in the chain
  timestamp: number;
  actor_id: string; // ID of the agent or system component that initiated the event
  event_type: "CREATE_NODE" | "EXECUTE_RUN" | "PUBLISH_ARGUMENT";

  // The payload contains the specifics of the event
  payload: {
    // Example for EXECUTE_RUN
    run_manifest_hash: string; // Hash of the Run Manifest
    outputs: {
      [output_name: string]: string; // e.g., "model_weights": "sha256:..."
    };
  };

  // The event is signed by the actor to prove authenticity
  signature: string;
}
```

### The Hash Chain

Events are linked chronologically. Each event's `id` is the hash of its own content (excluding `id`, `parent_id`, and `signature`). The `parent_id` is the `id` of the preceding event. This creates a simple, powerful hash chain. To verify the entire history, one only needs to store the hash of the most recent event (the `ledger_head`) and traverse the chain backwards.

For efficiency, events can be batched into blocks, and the block headers can be linked in a Merkle Tree, allowing for more efficient verification of the ledger's integrity.

## 3. The Run Manifest: Guaranteeing Reproducibility

To ensure any experiment can be perfectly reproduced, the `EXECUTE_RUN` event does not describe the experiment directly. Instead, it points to a **Run Manifest**, a signed, content-addressed document.

```yaml
# Example Run Manifest
id: "sha256:f00dcafe..." # Hash of this manifest's content
version: "1.0"
methodology_hash: "sha256:..." # Link to the Methodology node in the Knowledge Lattice

# Every input is specified by its content-address
inputs:
  - name: "training_data"
    hash: "sha256:c0ffee..."
    source_type: "dataset"
  - name: "source_code"
    hash: "sha256:c0de..."
    source_type: "git_commit"

# The exact execution environment
environment:
  type: "container"
  image_hash: "sha256:b10b..."

# The precise command to run
command: ["python", "train.py", "--data", "training_data"]

# Signature of the Experimentalist agent that created the manifest
signature: "..."
```

By executing an experiment using only the information in a `RunManifest`, the Foundry guarantees that the result will be identical, no matter when or where it is run. The manifest itself is stored in the CAS, and its hash is what's recorded in the ledger, ensuring it too is immutable.
