# Claims — Interface-Executable Assessment Protocol (IEAP)

## Independent Claims

1. Method: receive evaluator interface spec; compile component; execute with determinism token; generate metrics + metric proof object committing to token and version; return via interface.
2. System: processors/memory executing the method.
3. CRM: medium storing instructions to perform the method.

## Dependent Claims

4. Interface spec includes capability registration and scored result retrieval.
5. Metric proof object includes Merkle commitment to intermediate artifacts.
6. Compute budget enforcement per interface call (runtime/memory limits).
7. Counterfactual metrics under modified policy/redaction with delta metrics.
8. Transparency log storing metric proof object digests.
9. Trusted execution environment attestation with quote included in proof object.
10. Versioned interface spec with backward compatibility rules.
11. Delivery as container image with conformance test suite.
