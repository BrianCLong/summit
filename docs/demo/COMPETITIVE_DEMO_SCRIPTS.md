# Competitive Demo Scripts

These 5 repeatable demos map directly to buyer value and prove that Summit (IntelGraph) has closed the gap between "platform" and "product."

## 1. Access Request with ABAC + Receipts

**Persona:** Security / IAM Lead
**Script:**

1. User (Alice) requests access to a restricted dataset in the Catalog Explorer.
2. System performs a policy preflight (ABAC check) and identifies a required approval from Bob.
3. Bob approves the request.
4. Alice gains access.
5. Operator opens the "Provenance" tab to show the cryptographically signed receipt of the approval and the updated access policy.

## 2. Incident → Change → Postmortem

**Persona:** Operations / SRE
**Script:**

1. A workflow fails intentionally due to a simulated external service outage.
2. The Workflow Debugger shows the failed step, retry attempts, and current state.
3. Operator triggers a "Rollback" action via the self-service catalog.
4. Action is gated by policy and requires a signed change-request receipt.
5. System generates a postmortem bundle including all execution logs and receipts.

## 3. Governance Lineage + “Why Access” Export

**Persona:** GRC / Data Lead
**Script:**

1. Auditor asks: "What data sources touched this intelligence report?"
2. Lead opens the Lineage View and traces the report back to its 5 upstream connectors.
3. Auditor asks: "Why does Bob have access to the raw data from Source X?"
4. Lead uses the "Explain Why" tool to produce a signed evidence bundle containing the specific OPA policy, Bob's attributes, and the approval receipt.

## 4. Self-Service Action Catalog

**Persona:** Platform Engineering
**Script:**

1. New developer wants to "Provision a new Mission Workspace."
2. Developer selects the template from the Action Catalog.
3. System shows the "Simulation Result": it will create a Neo4j subgraph, 3 OPA policies, and a Grafana dashboard.
4. Developer clicks "Provision."
5. System executes the Maestro workflow and emits a signed completion receipt.

## 5. Unit Economics per Tenant

**Persona:** CFO / FinOps
**Script:**

1. Open the FinOps Cockpit.
2. Drill down into "Tenant A" and see their cost attribution (Compute, LLM tokens, Storage).
3. Identify a cost spike caused by a specific workflow run.
4. Compare the COGS per workflow run against the tenant's current pricing tier.
5. Export a chargeback report with signed receipts for auditing.
