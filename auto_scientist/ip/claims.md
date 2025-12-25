# Claims

## Independent Claims

1.  A computer-implemented method for automated scientific discovery, the method comprising:
    a) generating, using a first machine learning model, a candidate scientific hypothesis based on a provided research topic;
    b) evaluating, using a second machine learning model, the candidate hypothesis against a set of pre-defined safety constraints;
    c) generating, using the second machine learning model, a critique if the candidate hypothesis violates a safety constraint;
    d) refining the candidate hypothesis using the first machine learning model based on the critique; and
    e) executing a simulation or experiment based on the refined hypothesis only if it satisfies the safety constraints.

2.  A system for safe automated research, comprising:
    a) a generator agent configured to propose experiment plans;
    b) an oversight agent configured to audit experiment plans against a safety constitution; and
    c) a runtime environment that executes plans approved by the oversight agent.

## Dependent Claims

3.  The method of Claim 1, wherein the safety constraints include a prohibition on generating pathogens.
4.  The method of Claim 1, wherein the second machine learning model is distinct from the first.
5.  The method of Claim 1, further comprising storing the lineage of the hypothesis and its critique in an immutable ledger.
6.  The system of Claim 2, wherein the oversight agent utilizes a chain-of-thought reasoning process.
7.  The system of Claim 2, wherein the runtime environment is sandboxed.
8.  The method of Claim 1, wherein the refining step is repeated up to a pre-determined maximum number of iterations.
9.  The system of Claim 2, further comprising a human-in-the-loop approval step for high-risk categories.
10. The method of Claim 1, wherein the first machine learning model is a Large Language Model (LLM).
