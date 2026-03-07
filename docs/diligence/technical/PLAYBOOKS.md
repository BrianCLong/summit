# Integration & Exit Playbooks

**Objective**: Be ready to integrate—or unwind.

We do not get "stuck" with bad tech. Every integration is reversible.

## 1. Integration Playbook (0-30-90)

### Day 0: The "Air Gap" Handshake

- [ ] **Identity**: Federation established (SSO).
- [ ] **Network**: VPC Peering or PrivateLink established (with Deny-All default).
- [ ] **Access**: "Break-glass" access for Summit SREs.
- [ ] **Billing**: Cloud accounts linked to Summit Organization.

### Day 30: Observability & Compliance

- [ ] **Logs**: Shipping logs to Summit's aggregator.
- [ ] **Metrics**: Standard Prometheus exporters installed.
- [ ] **Support**: Unified ticketing queue.
- [ ] **Audit**: Gap analysis remediation plan finalized.

### Day 90: Functional Convergence

- [ ] **Data**: Source-of-truth reconciliation.
- [ ] **API**: Gateway unification (one DNS entry).
- [ ] **Organization**: Team merged into Summit Engineering structure.
- [ ] **Deprecation**: Legacy auth/systems turned off.

## 2. Exit / Unwind Playbook

If the integration fails or we divest, we must be able to cut the cord cleanly.

### A. Data Separation

- **Tenant Data**: Scripts to export tenant data back to portable formats (JSON/CSV).
- **Shared State**: Identification of any "entangled" records in Summit DBs.

### B. Access Revocation

- **Kill-Switch**: One-button revocation of all Service Account tokens.
- **Firewall**: Reverting VPC Peering/Allow-lists.

### C. Artifact Cleanup

- **Code**: Reverting monorepo merges (easier if "Adapter" pattern was used).
- **Infra**: Terraform `destroy` for associated resources.

## 3. Testing Reversibility

- **Requirement**: Before "Day 90" (Full Merge), a "Reversibility Test" must be run in Staging.
- **Test**:
  1.  Provision the integration.
  2.  Ingest test data.
  3.  Execute the **Exit Playbook**.
  4.  Verify Summit remains healthy and no ghost data remains.
