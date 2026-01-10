# Compliance Deliverables

Artifacts and mappings supporting DFARS 7012/7019/7020/7021, NIST SP 800-171 Rev. 3, CMMC readiness, and NATO releasability handling. These deliverables align with policy-as-code enforcement in `policy/opa/contracting_compliance.rego` and related OPA bundles.

## Artifact Index

| Area              | Primary Artifacts                                                                           | Evidence Outputs                                         | Policy Enforcement                               |
| ----------------- | ------------------------------------------------------------------------------------------- | -------------------------------------------------------- | ------------------------------------------------ |
| DFARS 7012        | `dfars/7012_mapping.md`                                                                     | Incident packet, preservation chain, reporting checklist | `intelgraph.policy.contracting` incident rules   |
| DFARS 7019/7020   | `dfars/7019_7020_sprs_evidence.md`                                                          | Control-evidence bundle, SPRS-ready assessment           | `intelgraph.policy.contracting` assessment rules |
| DFARS 7021        | `dfars/7021_cmmc_readiness.md`                                                              | Continuous affirmation window, control sufficiency       | `intelgraph.policy.contracting` assessment rules |
| NIST 800-171      | `nist_800_171/control_matrix.csv`, SSP/POA&M templates                                      | Control-to-evidence traceability                         | Policy references per control family             |
| NATO Handling     | `nato/handling_and_releasability.md`                                                        | Marking metadata, releasability packs                    | Scope token + egress rules                       |
| Supply Chain      | `supply_chain/sbom.md`, `supply_chain/slsa_provenance.md`                                   | SBOM + provenance validation                             | SBOM + attestation checks                        |
| Incident Response | `incident_response/reporting_runbook.md`, `incident_response/retention_and_preservation.md` | Incident binder + retention ledger                       | Incident packet policy checks                    |

## Evidence Packaging

1. Generate the releasability or assessment pack.
2. Bind each pack to a replay token and manifest hash.
3. Store digests in the transparency log.
4. Export a compliance binder with immutable evidence pointers.

## Review Cadence

- Quarterly: refresh evidence matrices and control mappings.
- After material change: re-run policy validation and regenerate evidence packs.
- Prior to bid: assemble an assessment binder and attach the compliance index.
