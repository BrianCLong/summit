# Summit SpecFlow: The Autonomous Change Workflow

**Status:** Draft
**Owner:** Platform Engineering
**Based on:** OpenSpec Workflows

## Vision
Summit SpecFlow transforms the software development lifecycle from a rigid pipeline into a fluid **Artifact Graph**. Instead of moving tickets through columns, we operate on a graph of **Actions** (Explore, Spec, Implement, Verify) that produce verifiable **Artifacts** (Findings, Specs, Changes, Evidence).

This approach treats every change as a **provenance-tracked subgraph**, enabling:
1.  **Machine-Verifiable Changes:** "Verify++" ensures completeness, correctness, and security.
2.  **Autonomous Participation:** Agents can read specs, propose changes, and run verification loops.
3.  **Conflict Proofs:** Merges are resolved by analyzing the artifact graph, not just git diffs.

## Core Philosophy: Actions, Not Phases
Work does not flow linearly. It expands and contracts through a DAG of actions.

*   **Explore:** Investigation $\rightarrow$ `Findings`
*   **Spec:** Findings $\rightarrow$ `Proposal` / `Spec`
*   **Implement:** Spec $\rightarrow$ `Change` (Code + Config)
*   **Verify:** Change $\rightarrow$ `EvidenceBundle`
*   **Archive:** Evidence + Change $\rightarrow$ `Release` (Merged State)

## The Summit SpecFlow CLI

The `/summit` command line interface (and ChatOps equivalent) drives this workflow.

### 1. `/summit:explore`
**Intent:** Structured investigation of a problem space.
**Output:** `Findings` artifact (Markdown + Data).
**Usage:**
```bash
summit explore "Why is the search latency spiking?"
```
**Process:**
*   Spawns an investigation agent (or template).
*   Queries observability/logs.
*   Produces a `FINDINGS.md` with hypotheses and data references.

### 2. `/summit:new <change-id>`
**Intent:** Start a new unit of work.
**Output:** A scaffolding directory `changes/<change-id>/`.
**Usage:**
```bash
summit new feat/user-auth
```
**Artifacts:**
*   `spec.yaml`: The machine-readable definition of the change.
*   `README.md`: Human context.
*   `trace.json`: Link to origin Intent/Ticket.

### 3. `/summit:continue`
**Intent:** Iteratively build the solution.
**Output:** Updated code or specs.
**Usage:**
```bash
summit continue --goal "Add OAuth provider"
```
**Process:**
*   Invokes the active agent (or prompts the user).
*   Updates artifacts based on current state and goal.

### 4. `/summit:ff` (Fast-Forward)
**Intent:** rapid planning for well-understood scopes.
**Output:** Generates implementation plan immediately.
**Usage:**
```bash
summit ff --spec "Update dependency X to version Y"
```

### 5. `/summit:verify` (Verify++)
**Intent:** Generate a proof that the change is ready.
**Output:** `EvidenceBundle` (PASS/FAIL + artifacts).
**Usage:**
```bash
summit verify
```
**The Rubric:**
*   **Completeness:** All requirements in `spec.yaml` are met?
*   **Correctness:** Tests pass? Edge cases covered?
*   **Coherence:** Design patterns match `DESIGN.md`?
*   **Security:** Threat model checked? Secrets scanned?
*   **Compliance:** Policy checks (OPA) pass?
*   **Performance:** No regressions in benchmarks?
*   **UX:** Accessibility checks pass? Screenshots generated?
*   **Provenance:** All steps signed and traced?

### 6. `/summit:archive`
**Intent:** Merge the change into the main branch/graph.
**Output:** Updated `main` + `provenance.jsonl`.
**Usage:**
```bash
summit archive
```
**Process:**
*   Squashes the change graph.
*   Embeds the `EvidenceBundle` hash into the commit.
*   Updates the Work Graph (closes ticket, links PR).

### 7. `/summit:bulk-archive`
**Intent:** Merge multiple independent changes simultaneously.
**Output:** Optimized merge order with conflict proofs.

## Artifact Graph Schema (Work Graph Integration)

All artifacts are nodes in the Summit Work Graph:

*   **`Change` Node:** Represents the `changes/<id>` directory.
    *   Properties: `status`, `owner`, `branch`.
    *   Edges: `IMPLEMENTS -> Intent`, `BASED_ON -> Spec`.
*   **`Findings` Node:** Result of exploration.
    *   Properties: `data_sources`, `confidence`.
    *   Edges: `SUPPORTS -> Hypothesis`.
*   **`EvidenceBundle` Node:** The proof of verification.
    *   Properties: `rubric_score`, `signer`, `timestamp`.
    *   Edges: `VERIFIES -> Change`.

## Governance & Moat

This system creates a **Governance Moat**:
*   **Traceability:** Every line of code can be traced back to a verified Spec and Intent.
*   **Policy-as-Code:** Policies are enforced by the `verify` command, not just human review.
*   **Learning:** The system learns which workflow paths (e.g., "Explore first" vs "FF") yield higher success rates.
