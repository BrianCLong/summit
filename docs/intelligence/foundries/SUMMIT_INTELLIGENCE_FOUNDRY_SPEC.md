# Summit Intelligence Foundry Specification

## 1. Executive Thesis

Firefly Foundry proves one thing decisively: **enterprises will only operationalize generative AI when IP, provenance, and control are absolute**.

Summit’s advantage is that we already built:
* Deterministic evidence systems
* Governance-first CI/CD
* Graph-native lineage and validation
* Multi-agent orchestration with policy enforcement

Summit **subsumes Foundry as a narrow specialization** inside a broader **Governed Intelligence Fabric**.

## 2. Core Concepts

### 2.1 Intelligence Foundries (Plural)
An **Intelligence Foundry** is any bounded intelligence domain where Assets -> Models -> Agents -> Decisions happen under full governance.

Examples:
* **Creative Foundry** (Firefly-like): Assets + Models = Brand-safe Content
* **Intelligence Analysis Foundry**: OSINT + Models = Verified Intel
* **Legal Reasoning Foundry**: Case Law + Models = Audit-ready Opinions

### 2.2 Asset Graph
Assets are not just files. They are graph nodes with:
* Ownership
* Licensing terms
* Temporal validity
* Jurisdictional constraints
* Downstream derivative lineage

### 2.3 Provenance-First Generation
Every output has a deterministic execution graph.
* **Evidence IDs** bound to every artifact.
* **Reproducible execution envelopes**.
* **Policy-signed attestations**.

### 2.4 Policy-Constrained Agents
Agents cannot act outside declared authority.
* Prompts validated like API calls.
* Outputs fail-closed if governance checks fail.

## 3. Schema Definitions

### FoundryAsset
Represents a raw material (image, text, document, data) used for training or generation.
* `id`: Unique Identifier
* `owner`: Entity claiming ownership
* `rights`: Licensing/Usage rights
* `lineage`: Provenance chain

### FoundryModel
A model trained or fine-tuned on specific Assets.
* `id`: Unique Identifier
* `baseModel`: Foundation model used
* `trainingAssets`: List of FoundryAssets used
* `policy`: Governance policy applied

### FoundryAgent
An autonomous actor operating within a Foundry.
* `id`: Unique Identifier
* `model`: FoundryModel used
* `constraints`: Policy constraints
* `capabilities`: Allowed actions

### FoundryEvidence
The proof of generation/action.
* `id`: Unique Identifier
* `agentId`: Agent that performed the action
* `input`: Input prompt/data
* `output`: Generated artifact
* `graph`: Full execution lineage
