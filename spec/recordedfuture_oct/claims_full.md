# OCT Full Claim Set

## Independent Claims

1. A computer-implemented method comprising:
   1.1 receiving an entity identifier associated with a cyber object;
   1.2 retrieving a set of threat signals about the entity identifier from a plurality of sources;
   1.3 computing a factor portfolio comprising a plurality of factor components, each factor component computed from a corresponding subset of the threat signals;
   1.4 calibrating at least one factor weight of the factor portfolio using outcome data comprising at least one observed incident outcome;
   1.5 generating a backtest artifact that quantifies predictive performance of the calibrated factor portfolio on historical data; and
   1.6 outputting a risk portfolio artifact comprising the factor portfolio, the backtest artifact, and a replay token binding the risk portfolio artifact to at least a policy version and an index version.

2. A system comprising one or more processors and one or more non-transitory computer-readable media storing instructions that, when executed, cause performance of the method of claim 1.

3. A non-transitory computer-readable medium storing instructions that, when executed, cause performance of the method of claim 1.

## Dependent Claims

4. The method of claim 1, wherein the plurality of factor components comprises at least exposure, exploitability, actor interest, and infrastructure proximity.
5. The method of claim 1, wherein calibrating comprises online learning that updates factor weights when new outcome data arrives.
6. The method of claim 1, wherein calibrating incorporates provenance-weighted decay based on source trust and signal freshness.
7. The method of claim 1, wherein the backtest artifact includes confidence intervals and a statistical significance test comparing to an uncalibrated baseline.
8. The method of claim 1, further comprising generating a minimal support set of signals for at least one factor component under a proof budget.
9. The method of claim 1, further comprising computing counterfactual impacts of remediation actions on at least one factor component and outputting the counterfactual impacts.
10. The method of claim 1, wherein the replay token includes a time window and a snapshot identifier for deterministic recomputation.
11. The method of claim 1, wherein outputting comprises including signed policy decision tokens binding subject context and purpose to access of the threat signals.
12. The system of claim 2, further comprising a cache keyed by entity identifier and replay token to reuse calibrated factor portfolios.
13. The system of claim 2, further comprising an egress budget enforcer limiting returned bytes and outputting redacted signal excerpts.

## Definitions

- **Factor portfolio**: a vector of calibrated components representing distinct
  threat dimensions.
- **Backtest artifact**: reproducible evidence of historical model performance.
