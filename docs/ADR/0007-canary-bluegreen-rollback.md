# ADR 0007: Adopt Canary + Blue/Green Rollbacks via Argo Rollouts

- **Context:** High availability expectations demand controlled releases with immediate rollback if SLOs degrade.
- **Decision:** Use Argo Rollouts to manage weighted canaries (5% -> 25% -> 100%) and maintain a hot-standby blue/green slice for instant revert.
- **SLO Impact:** Protects the 99.9% API success rate and latency SLO by halting promotion if error budget burn >2% in 10 minutes or p95 latency exceeds 1.5s.
- **Failure Domain:** Rollout controller scoped per regional cell; a failed canary only affects its target cell and routes revert independently of other regions.
- **Consequences:** Requires precise observability integration and traffic shadowing, but minimizes customer-facing downtime during deploys.
