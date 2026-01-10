# External & Regulatory Assurance Packet

This packet assembles the evidence needed for regulators, auditors, or external partners to validate autonomous operations without exposing internal complexity.

## 1. Packet Contents

- **Autonomy Overview:** Current autonomy tiers in use, scope of autonomous playbooks, and decision boundaries.
- **Control Inventory:** Summaries from `CONTROL_EFFECTIVENESS.md` with effectiveness scores and drill outcomes.
- **Risk & Value Summary:** Metrics from the dashboard snapshot (actions by tier, risk heatmap, value vs. exposure, counterfactual lift).
- **Recent Activity:** Kill-switch activations, near-misses, top three control interventions, and any incidents with remediation status.
- **Delegations & Approvals:** Active approvals with expiry dates and provenance hashes.
- **Evidence Index:** Signed references to receipts, policy hashes, simulation runs, and control logs.
- **Disclaimers:** Link to `DISCLAIMERS.md` and any jurisdiction-specific notes.

## 2. Exportable Reports

- **Formats:** PDF summary + JSON evidence index; both signed and hashed. Optional CSV for regulators needing structured data.
- **Time Bounding:** Each packet is tied to a window (monthly/quarterly). Evidence references must include timestamps and hashes.
- **Immutability:** Store hash in the provenance ledger; regenerate only with a new version number and change log.

### 2.1 Evidence Index Schema (minimum fields)

- `packet_id`, `packet_version`, `window_start`, `window_end`
- `dashboard_snapshot_id`, `snapshot_hash`
- `receipts[]` (id + hash)
- `policy_hashes[]` (id + version)
- `control_events[]` (id + hash)
- `simulation_runs[]` (id + seed + hash)
- `delegation_records[]` (id + hash)
- `signatures[]` (signer + timestamp + hash)

## 3. Preparation Checklist

- [ ] Snapshot of the Executive Assurance Dashboard is frozen and referenced by timestamp.
- [ ] Evidence index contains working links to all receipts and control logs.
- [ ] Delegation records are current; expired approvals removed or marked.
- [ ] Kill-switch drill within the period is included with outcome and verification.
- [ ] Counterfactual simulation runs are archived with reproducible parameters.
- [ ] Disclaimers validated for the target audience/jurisdiction.

## 4. Submission & Handling

- **Approvals:** Governance lead signs off; CISO/Compliance co-sign for regulated domains.
- **Delivery:** Secure transfer (e.g., regulator portal, encrypted email); no raw production logs.
- **Retention:** Keep signed packets per policy (e.g., 7 years for regulated sectors).

## 5. Packet Manifest (human-readable summary)

- **Scope:** Autonomy tiers covered, systems in scope, and excluded domains.
- **Controls Summary:** Count of control firings + effectiveness score.
- **Risk Posture:** Risk score trend + open risk acceptances.
- **Value Summary:** Net value vs. exposure with confidence intervals.
