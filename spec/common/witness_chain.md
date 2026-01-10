# Witness Chains

Witness chains provide hash-linked evidence of pipeline execution.

## Structure

- Compute digest per stage input/output and link them as a Merkle chain.
- Record interface version and policy toggles in each link.

## Usage

- Include witness chains in peer-review packages and evaluator bundles.
- Store chain heads in the transparency log for tamper evidence.

## Validation

- Provide verification scripts for evaluators to recompute digests from replay manifests.
