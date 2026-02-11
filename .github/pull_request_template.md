## Summary

<!-- What does this PR do? Link to Jira ticket or issue. -->

## Risk & Surface (Required)

<!-- Select the appropriate risk level and surface area. -->

**Risk Level** (Select one):

- [ ] `risk:low` (Docs, comments, safe refactors)
- [ ] `risk:medium` (Feature flags, backward-compatible changes)
- [ ] `risk:high` (Database migrations, auth changes, critical path)
- [ ] `risk:release-blocking` (Critical fixes only)

**Surface Area** (Select all that apply):

- [ ] `area:client`
- [ ] `area:server`
- [ ] `area:docs`
- [ ] `area:infra`
- [ ] `area:ci`
- [ ] `area:policy`

## Assumption Ledger

<!-- State your assumptions, ambiguities, tradeoffs, and stop conditions. -->

- **Assumptions**:
- **Ambiguities**:
- **Tradeoffs**:
- **Stop Condition**:

## Execution Governor & Customer Impact

- [ ] **Single Product Mode**: Respects active product (FactFlow) or includes `.exec-override`.
- [ ] **Frozen Code**: Does not touch frozen products without override.
- **Customer Impact**: <!-- Positive/Negative impact on end user? -->
- **Rollback Plan**: <!-- How to revert if production breaks? -->

## Evidence Bundle

<!-- Attach evidence that your change works and is safe. See docs/evidence-bundle-spec.md -->

- [ ] **Tests**: New or updated tests passing?
- [ ] **Screenshots**: Attached for UI changes?
- [ ] **Evidence Generated**: Bundle attached or linked?
- [ ] **Prompt Hash**: `prompts/registry.yaml` updated (if prompts changed)?

## Security Impact

- [ ] **Security Impact**: Does this change touch auth, PII, or crypto?
  - If YES, link to [Security Triage/Backlog](docs/SECURITY_PHASE1_STARTER_PACK_BACKLOG.md).


## Governance & Labels Contract

<!-- See docs/labels.md for guidance. -->

- [ ] **Labels**: Applied `lane:*`, `level:*`, and `compliance:*` labels?
- [ ] **No Secrets**: Verified no secrets in code or history?
- [ ] **Audit**: If `compliance:audit-ready`, verified audit logs are generated?

## Green CI Contract Checklist

<!-- Must be checked before merge. See docs/governance/GREEN_CI_CONTRACT.md -->

- [ ] **Lint**: Ran `pnpm lint` locally.
- [ ] **Tests**: Ran `pnpm test:unit` locally.
- [ ] **Determinism**: No leaked singletons or open handles.
- [ ] **Evidence**: Added at least one test case or verification step.

## CI & Merge Train Rules

<!-- See docs/runbooks/CI_RELEASE_GATE_RUNBOOK.md and docs/release/DAILY_DASHBOARD.md -->

**If CI is Blocked:**

- [ ] Docs/Metadata PRs may proceed.
- [ ] Behavior changes must wait for green CI.
- [ ] Do not bypass gates without written approval from Release Captain.

## Verification

<!-- How did you verify this change? -->

- [ ] Automated Test
- [ ] Manual Verification
- [ ] Snapshot / Screenshot

<!-- AGENT-METADATA:START -->

{
"promptId": "",
"taskId": "",
"tags": []
}

<!-- AGENT-METADATA:END -->
