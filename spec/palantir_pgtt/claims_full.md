# Claims — PGTT

## Independent Claim 1 — Method

1. A computer-implemented method comprising:
   1.1 receiving a policy specification and an ontology specification for a graph dataset;
   1.2 generating a set of test fixtures comprising synthetic graph instances that satisfy structural constraints of the ontology specification;
   1.3 generating, for each test fixture, a set of access test cases that exercise the policy specification for at least one subject context and purpose;
   1.4 executing the set of access test cases against an access control evaluation engine to obtain policy outcomes;
   1.5 detecting a governance regression by comparing the policy outcomes to reference outcomes; and
   1.6 outputting a governance test report comprising the detected governance regression and a replay token.

## Independent Claim 2 — System

2. A system comprising one or more processors and one or more non-transitory computer-readable media storing instructions that, when executed, cause performance of the method of claim 1.

## Independent Claim 3 — CRM

3. A non-transitory computer-readable medium storing instructions that, when executed, cause performance of the method of claim 1.

## Dependent Claims

4. The method of claim 1, wherein generating test fixtures comprises constraint solving to satisfy ontology field types and relation cardinalities.
5. The method of claim 1, wherein generating access test cases comprises generating boundary cases that target redaction rules and purpose-based constraints.
6. The method of claim 1, wherein reference outcomes are derived from a prior policy version and the governance regression comprises an allow-expansion or a deny-expansion.
7. The method of claim 1, further comprising generating an explanation artifact identifying a minimal set of policy rules responsible for the governance regression.
8. The method of claim 1, wherein executing is terminated upon exceeding an execution budget comprising maximum test cases or maximum runtime.
9. The method of claim 1, wherein the replay token comprises a policy version pair, an ontology version pair, and a seed value.
10. The method of claim 1, wherein outputting comprises including a cryptographic commitment to test fixtures via a Merkle root.
11. The system of claim 2, further comprising a cache keyed by policy hash and ontology hash to reuse generated fixtures.
12. The system of claim 2, further comprising a trusted execution environment configured to attest to test execution, wherein the governance test report includes an attestation quote.
13. The method of claim 1, further comprising generating counterfactual tests that isolate a subset of changed policy rules and estimating regression risk.
