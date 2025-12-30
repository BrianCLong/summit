# Claims — CEVH

## Independent claims

1. **Method**
   1.1 Receiving an asset identifier.  
   1.2 Retrieving, from a graph store, exposure signals associated with the asset identifier, the exposure signals comprising at least two of vulnerability indicators, configuration indicators, credential leakage indicators, or infrastructure proximity indicators.  
   1.3 Computing a time-varying hazard value for the asset identifier using the exposure signals and time decay.  
   1.4 Detecting a change point in the time-varying hazard value.  
   1.5 Generating a forecast artifact comprising (i) the hazard value, (ii) a time-to-event estimate, and (iii) a decomposition witness identifying a support set of exposure signals contributing to the hazard value.  
   1.6 Outputting the forecast artifact with a replay token.

2. **System**
   A system comprising one or more processors and one or more non-transitory computer-readable media storing instructions that, when executed, cause performance of the method of claim 1.

3. **CRM**
   A non-transitory computer-readable medium storing instructions that, when executed, cause performance of the method of claim 1.

## Dependent claims

4. The method of claim 1, wherein computing comprises applying a survival model that outputs a confidence interval for the time-to-event estimate.
5. The method of claim 1, wherein detecting the change point comprises a sequential probability ratio test or Bayesian online change-point detection.
6. The method of claim 1, wherein the decomposition witness is a minimal support set computed under a proof budget limiting at least one of signal count or verification time.
7. The method of claim 1, further comprising computing a counterfactual forecast under removal of an exposure signal and outputting an impact metric.
8. The method of claim 1, wherein the replay token comprises an index version, a policy version, a snapshot identifier, and a time window identifier.
9. The method of claim 1, wherein retrieving exposure signals enforces a policy scope and outputs redacted excerpts under an egress budget.
10. The method of claim 1, wherein the forecast artifact includes a cryptographic commitment to hashes of exposure signals via a Merkle proof.
11. The system of claim 2, further comprising a cache keyed by asset identifier and replay token to reuse hazard computations.
12. The system of claim 2, further comprising a trusted execution environment configured to attest to hazard computation, wherein the forecast artifact includes an attestation quote.
13. The method of claim 1, further comprising emitting an alert when the hazard value exceeds a threshold for a dwell time.
