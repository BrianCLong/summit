# Defense Simulation Apparatus Dependent Claims (S451–S480)

## Cluster 1: Policy arbitration across overlays in ranking (S451–S460)

S451. The apparatus of claim S1, wherein the apparatus applies a plurality of policy overlays comprising at least one of a governance policy template, a tenant override policy bundle, a partner overlay policy bundle, a jurisdiction constraint set, a locale constraint set, or a connector capability grant.
S452. The apparatus of claim S451, wherein the apparatus computes an effective policy decision for each candidate defense action by performing policy arbitration using deterministic precedence rules among the plurality of policy overlays.
S453. The apparatus of claim S452, wherein the deterministic precedence rules specify that deny outcomes prevail over allow outcomes when policy overlays conflict.
S454. The apparatus of claim S452, wherein the apparatus generates an arbitration proof artifact comprising an ordered list of applied overlays, precedence rule identifiers, and intermediate outcomes and records the artifact in an audit log.
S455. The apparatus of claim S451, wherein the apparatus denies outputting external publishing actions when any required policy overlay is missing or not attested.
S456. The apparatus of claim S452, wherein the policy engine outputs a modify decision by applying a least-permissive modification that satisfies all applicable overlays and the apparatus re-simulates modified actions.
S457. The apparatus of claim S452, wherein the apparatus detects an arbitration ambiguity event when overlays yield incompatible modify requirements and enters conflict-safe mode.
S458. The apparatus of claim S457, wherein the apparatus excludes external publishing actions from ranking while the arbitration ambiguity event remains unresolved and outputs monitoring-only actions.
S459. The apparatus of claim S451, wherein the replay manifest includes identifiers and versions of all applied overlays for each ranked action.
S460. The apparatus of claim S452, wherein the apparatus records arbitration proof artifacts linked to snapshot hashes and policy bundle hashes used to generate ranked outputs.

## Cluster 2: Formal localization QA + back-translation + locale regression in ranking (S461–S470)

S461. The apparatus of claim S1, wherein the apparatus performs localization quality assurance on translated external publishing candidate defense actions prior to outputting a permitted defense action.
S462. The apparatus of claim S461, wherein localization quality assurance comprises back-translation of a translated defense message into a source language and comparison of semantic equivalence against the source message.
S463. The apparatus of claim S462, wherein the apparatus computes a localization divergence score and excludes external publishing actions from ranking when the localization divergence score exceeds a threshold.
S464. The apparatus of claim S461, wherein localization quality assurance comprises verifying presence of locale-specific required disclaimers and required attribution fields.
S465. The apparatus of claim S1, wherein the apparatus maintains a localization regression suite and executes the localization regression suite prior to enabling a new translation model version for ranking.
S466. The apparatus of claim S465, wherein the apparatus records localization regression results as evidence artifacts linked to translation model version identifiers.
S467. The apparatus of claim S461, wherein the apparatus restricts external publishing actions to template-based messaging when localization quality assurance confidence is below a threshold.
S468. The apparatus of claim S461, wherein the replay manifest includes localization QA artifact identifiers, back-translation artifact identifiers, and divergence scores excluding never-log fields.
S469. The apparatus of claim S461, wherein the policy engine modifies a translated candidate defense action by substituting a pre-approved localized template when localization quality assurance fails and the apparatus re-simulates the modified action.
S470. The apparatus of claim S461, wherein the apparatus requires approval to override a localization QA failure and records an override event in an audit log.

## Cluster 3: Cross-connector blast radius budgeting in ranking/output (S471–S480)

S471. The apparatus of claim S1, wherein the apparatus maintains a blast radius budget defining limits on at least one of audience size, jurisdiction count, channel count, or publication frequency for external publishing actions.
S472. The apparatus of claim S471, wherein the blast radius budget is maintained per connector identifier and per tenant identifier.
S473. The apparatus of claim S471, wherein the apparatus computes a projected blast radius for a candidate defense action using predicted reach metrics and excludes actions from ranking when projected blast radius exceeds the blast radius budget.
S474. The apparatus of claim S471, wherein the replay manifest includes budget identifiers, projected blast radius values, and budget consumption outcomes for ranked actions.
S475. The apparatus of claim S471, wherein the apparatus enforces cross-connector budgets that limit cumulative blast radius across multiple connectors within a rolling time window.
S476. The apparatus of claim S471, wherein the apparatus outputs monitoring-only actions when budgets are exhausted.
S477. The apparatus of claim S471, wherein the apparatus requires approvals to increase a blast radius budget and records budget change approvals with approver credential identifiers.
S478. The apparatus of claim S471, wherein the apparatus outputs a canary recommendation when a candidate action consumes more than a threshold portion of the blast radius budget.
S479. The apparatus of claim S478, wherein the apparatus outputs an automatic rollback recommendation when predicted trust impact exceeds a threshold during the canary.
S480. The apparatus of claim S471, wherein the apparatus generates a blast radius proof artifact comprising projected reach, budgets applied, and budget outcomes linked to snapshot hash and policy bundle hash.
