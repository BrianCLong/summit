# Product Beta Standards

## Beta Entrance Criteria

Before a feature can enter "Beta", it must meet the following criteria:

- [ ] **Telemetry**: Feature usage and errors are tracked in dashboards.
- [ ] **Documentation**: "How-to" guide exists (internal or public).
- [ ] **Support**: Support macros/templates created.
- [ ] **Kill Switch**: Feature flagged and can be disabled instantly.
- [ ] **Known Limitations**: Public page listing what doesn't work yet.
- [ ] **Rollback Plan**: Documented steps to revert.

## Beta Lifecycle

1.  **Pilot (Alpha)**: Internal users + trusted design partners (hand-picked).
2.  **Private Beta**: Invite-only list of customers.
3.  **Public Beta**: Open to all, but labeled "Beta".

## Quality Gates

- **SLOs**: Beta features must meet relaxed SLOs (e.g., 99% availability vs 99.9%).
- **Time-to-Fix**: Blocker bugs must be fixed within 48h.

## Graduation (Beta -> GA)

To move to GA, the feature must have:

- [ ] 4 weeks of stable operation (within SLO).
- [ ] No critical open bugs.
- [ ] Completed security review.
- [ ] Council sign-off.

## "Beta Forever" Prevention

- **Time Limit**: Features cannot stay in Beta for > 6 months.
- **Action**: At 6 months, either Graduate to GA or Kill.
