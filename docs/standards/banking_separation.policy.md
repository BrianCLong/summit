# Banking Separation Policy

## Policy

A submission is non-compliant when `banking.separate_business_bank_account` is false or missing.

## Rationale

Separate business banking is required to preserve auditable business operations and reduce compliance risk.

## Enforcement

The readiness engine records missing banking separation as a mandatory deficiency and applies deny-by-default when threshold is not met.
