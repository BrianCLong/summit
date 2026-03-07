# Compliance & Trust Kit

Send this when a prospect asks "Is this secure?" Customize links and artifacts before sharing.

## Contents Checklist

- [ ] **Architecture overview**: Data flows, identity, network zones, encryption, logging.
- [ ] **SBOM + attestations**: Signed SBOM, dependency risk summary, supply-chain controls.
- [ ] **Provenance & audit**: How data/outputs are signed, lineage stored, tamper evidence.
- [ ] **Security testing**: Penetration summary, static/dynamic scan results, remediation status.
- [ ] **Compliance mapping**: FedRAMP path, RMF controls (NIST 800-53/CSF), SOC2/ISO mappings if applicable.
- [ ] **Data handling**: Classification, retention, residency, cross-domain handling, deletion process.
- [ ] **Responsible AI**: Model governance, training data controls, red-teaming results, human-in-the-loop design.
- [ ] **Questionnaire template**: Pre-filled answers for common security questionnaires.

## How to Use

1. **Qualify**: Confirm security lead and their review timeline. Log questions in CRM.
2. **Package**: Share tailored packet (only controls you can prove). Include SBOM + architecture + responsible AI note.
3. **Review call**: Offer 30–45 min with security + eng leads to walk through provenance, logging, and data handling.
4. **Track**: Record artifacts sent and responses. Create risk flag if unanswered >10 days.

## FedRAMP / RMF Talking Points

- Boundary and data flow defined; all services mapped to ATO scope.
- Logging aligned to AU, IA, AC, CM, IR controls; provenance covers chain-of-custody.
- SBOM with signed attestations; vulnerability management SLA by severity.
- Identity federation with least privilege roles; MFA/step-up supported.
- Data residency and backup posture documented; retention configurable per classification.

## Security Questionnaire Template (Editable)

- **Company overview**: <mission + footprint>
- **Hosting**: <cloud/IL/on-prem>; regions; data residency.
- **Access control**: IdP integration, RBAC/ABAC, audit logging, break-glass procedure.
- **Data protection**: Encryption (in transit/at rest), key management, data segregation.
- **Development**: SDLC, code scanning, artifact signing, change management.
- **Operations**: Monitoring, incident response SLAs, DR/BCP, patch cadence.
- **AI-specific**: Model registry, dataset provenance, prompt/response logging, red-team/testing cadence, guardrails.

## Sending Rules

- Never overshare: provide only what is needed under NDA, redact secrets.
- Date-stamp every artifact sent; keep checksum/signature where possible.
- Pair the packet with a short meeting to handle objections live.
