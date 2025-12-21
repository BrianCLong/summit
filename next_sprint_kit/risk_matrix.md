# Risk Matrix

| Risk | Impact | Likelihood | Mitigation | Owner | Trigger | Contingency |
| --- | --- | --- | --- | --- | --- | --- |
| Preview latency regression | High | Medium | Use seeded fixtures; enforce P95 guardrail alerts; profiling in CI | Search Lead | P95 > 850 ms for 3 runs | Disable heavy expansions, roll back to previous model weights |
| Policy drift between compiler and preview | High | Low | Contract tests between policy registry and compiler; schema versioning | Policy Architect | Failing contract tests | Freeze policy set; hotfix mapping; notify governance |
| Ledger hash chain break | Critical | Low | Append-only store with verification job; checksum alarms | Ledger Team | Verification job fails | Pause exports; rebuild chain from last valid snapshot |
| Cost guard false positives | Medium | Medium | Multi-tier thresholds; dry-run mode with audit; override escalation | FinOps | Alert volume > expected baseline | Switch to advisory mode; retrain thresholds on demo data |
| Demo data mismatch in runbooks | Medium | Medium | Deterministic generator with checksums; runbook references version | Runbook PM | Runbook validation fails | Regenerate fixtures; update runbook hashes |
| Chaos drill destabilizes shared env | High | Low | Isolated sandbox namespace; traffic shaping; rollback checklist | SRE | Error budget burn >5% | Abort drill; apply rollback steps; open postmortem |
