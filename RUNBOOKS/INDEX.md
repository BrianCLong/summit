# IntelGraph Runbooks Index

Quick reference for operational procedures and incident response.

## Core Services

### MC Platform v0.4.5

- **[IncidentAutoReweighter](./incident-auto-reweighter.md)** - Auto-reweighting during critical incidents (NEW)
  - Feature flags, pin/unpin commands, failure modes, recovery procedures
  - P1 service with comprehensive monitoring and alerting

### General Operations

- [Release Captain Quick Reference](./release-captain-quick-reference.md)
- [Release Captain Verification](./release-captain-verification.md)
- [Disaster Recovery Procedures](./disaster-recovery-procedures.yaml)
- [Schema Migration Playbook](./schema-migration-playbook.md)
- [Postmortem Template](./postmortem_template.md)

## Incident Response

### Critical Systems

- [Incident Auto-Reweighter](./incident-auto-reweighter.md) - MC Platform QAM service
- [Rollback Procedures](./rollback.yaml)
- [Chaos Drill](./chaos-drill.yaml)

### Intelligence Operations

- [CTI Rapid Attribution](./cti-rapid-attribution.yaml)
- [Fraud Ring Detection](./fraud-ring-detection.yaml)
- [Insider Risk Assessment](./insider-risk-assessment.yaml)
- [Supply Chain Exposure](./supply-chain-exposure.yaml)

## Deployment & Operations

- [Deploy Promote](./deploy-promote.yaml)
- [Dev Bootstrap](./dev-bootstrap.md) — golden path startup with verification and troubleshooting
- [MVP3 Go Live](./mvp3_go_live.md)
- [V24 Coherence](./v24-coherence.md)

## Investigation Playbooks

- [AML Suspicious Activity](./aml-suspicious-activity.yaml)
- [Ransomware Triage](./ransomware-triage.yaml)
- [Phishing Cluster](./phishing-cluster.yaml)
- [Disinfo Campaign](./disinfo-campaign.yaml)
- [Actor Pivoting](./actor-pivoting.yaml)
- [IP Theft Investigation](./ip-theft-investigation.yaml)

## Service-Specific

### Docling

- [Docling Deploy](./docling-deploy.md)
- [Docling On-Call](./docling-oncall.md)
- [Docling Rollback](./docling-rollback.md)

### Demos & Testing

- [Link Analysis Demo](./link-analysis-demo.yaml)
- [ETL Assistant Demo](./etl-assistant-demo.yaml)
- [Demo Seed](./demo-seed.yaml)

---

**🚨 For P1 incidents involving MC Platform v0.4.5 IncidentAutoReweighter, go directly to:**
[incident-auto-reweighter.md](./incident-auto-reweighter.md)

**Last Updated:** $(date -u +%Y-%m-%d) - Added MC Platform v0.4.5 IncidentAutoReweighter runbook
