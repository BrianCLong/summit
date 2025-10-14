# Risk Register

```
ID  Risk                               Likelihood Impact Owner   Mitigation
R1  Query planner SLO breach            Medium     High   Platform k6 tests + Cost Guard
R2  ER false merges                     Medium     Medium Backend  Reversible merges + HITL
R3  Provenance manifest drift           Low        High   Tools    External verifier in CI
R4  UI performance regressions          Medium     Medium FE       Benchmarks + lazy loading
R5  Policy blocks legitimate exports    Low        Medium Security Dry-run simulation + appeal path
```
