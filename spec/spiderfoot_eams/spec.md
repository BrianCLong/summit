# SpiderFoot EAMS Specification

## Concept

Egress-Accounted Module Sandboxing (EAMS) runs OSINT modules inside sandboxes
that emit egress receipts, enabling enforceable passive-only policies.

## Goals

- Enforce egress policies at runtime.
- Provide compliance receipts and determinism tokens.
- Support attestable execution when required.

## Processing flow

1. Select sandbox policy for the module and target.
2. Execute module in sandbox with egress monitoring.
3. Generate egress receipt and hash commitment.
4. Evaluate compliance decision and output results.

## Outputs

- **Module results** with redactions as needed.
- **Egress receipt** with summary, commitment, and determinism token.
- **Compliance decision** bound to subject context and purpose.
