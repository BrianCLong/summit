# Claims — Feed-Adaptive Signal Calibration with Drift Alarms (FASC)

## Independent Claim 1 — Method

1. A computer-implemented method comprising:
   1.1 retrieving threat signals associated with a set of entities from a plurality of feeds;
   1.2 computing a feed reliability score for each feed using outcome data comprising at least one observed incident outcome;
   1.3 updating a set of feed weights based on the feed reliability scores;
   1.4 detecting feed drift for a feed based on a divergence between expected signal behavior and observed signal behavior;
   1.5 upon detecting feed drift, applying a quarantine action comprising at least one of reducing a feed weight, excluding the feed from fusion, or requiring additional corroboration for the feed; and
   1.6 outputting a calibration artifact comprising the feed weights, a drift indicator, and a justification witness committing to evidence supporting the quarantine action.

## Independent Claim 2 — System

2. A system comprising one or more processors and one or more non-transitory computer-readable media storing instructions that, when executed, cause performance of the method of claim 1.

## Independent Claim 3 — CRM

3. A non-transitory computer-readable medium storing instructions that, when executed, cause performance of the method of claim 1.

## Dependent Claims

4. The method of claim 1, wherein computing feed reliability scores comprises online learning that updates weights upon arrival of new outcome data.
5. The method of claim 1, wherein detecting feed drift comprises computing a statistical divergence measure between a historical distribution of signals and a current distribution of signals.
6. The method of claim 1, wherein the quarantine action comprises routing signals from the feed to a corroboration-only path requiring confirmation from at least one other feed.
7. The method of claim 1, wherein the justification witness includes a minimal support set under a proof budget limiting at least one of evidence count or bytes.
8. The method of claim 1, wherein the calibration artifact includes a replay token binding the calibration to a time window and a feed version set.
9. The method of claim 1, further comprising generating a counterfactual calibration that simulates removal of the feed and estimates impact on predictive performance.
10. The system of claim 2, further comprising a cache that stores per-feed drift statistics keyed by time window.
11. The method of claim 1, wherein updating feed weights includes applying provenance-weighted decay based on signal freshness.
12. The method of claim 1, further comprising emitting an alert when drift exceeds a threshold for a duration exceeding a dwell time.
