# [MVP+] OSINT lead publication flow: ingest → IntelGraph → Maestro → publish/block

## Checklist

- [ ] Define minimal OSINT lead schema in IntelGraph (entities, relationships, Evidence, EpistemicClaims)
- [ ] Implement Switchboard pipeline that ingests sample OSINT data and emits normalized events into IntelGraph
- [ ] Implement Maestro `intent.evaluate` / `claim.register` calls for “lead:propose” and “lead:publish” actions
- [ ] Encode at least one epistemic policy: thresholds for evidence count, provenance quality, and contradiction checks before publish
- [ ] Implement CompanyOS API endpoint to fetch a lead with: graph context, evidence list, and Maestro decision/rationale
- [ ] Add an E2E test: given sample OSINT inputs, pipeline produces a lead and Maestro returns APPROVE/BLOCK with rationale
- [ ] Document the flow (sequence diagram + narrative) under `/docs/osint-lead-publication.md`
