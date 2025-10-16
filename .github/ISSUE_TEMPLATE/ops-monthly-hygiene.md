---
name: 'Ops: Monthly Hygiene (Chaos/DR, Backups, Cost)'
about: Recurring operational resilience & compliance checklist
title: 'Ops: Monthly Hygiene — {{month}} {{year}}'
labels: ['ops', 'hygiene', 'cadence:monthly', 'priority:high']
assignees: []
---

## 🧪 Chaos/DR

- [ ] Trigger failover simulation; verify RTO/RPO targets
- [ ] Rollback drill: prove rollback to last good Helm revision
- [ ] Document results & deltas

## 🔄 Backups/Restore

- [ ] Verify last backup timestamps
- [ ] Perform restore test to staging
- [ ] Record evidence (screenshots/logs) in `audit/snapshots/`

## 💸 Cost & Autoscaling

- [ ] Review autoscaling floors/ceilings; confirm scale-to-zero where safe
- [ ] Inspect major cost deltas; file follow-up PRs if needed

## 🔐 Security & Governance

- [ ] Rotate ephemeral deploy tokens/keys
- [ ] Review OPA/ABAC policies & exceptions
- [ ] Verify `promote-on-build` permissions (least privilege)

## 📜 Evidence

- [ ] `make evidence` run & artifacts attached
- [ ] SBOM/attestation samples captured for current prod images
- [ ] Update `audit/ga-core-evidence-pack.md`

> Owner on call: @assign-here
> Links: Cost dashboard | DR docs | Access policy
