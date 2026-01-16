Owner: Governance
Last-Reviewed: 2026-01-14
Evidence-IDs: none
Status: active

# Meta-Improvement Framework

This document defines the process for proposing, evaluating, and implementing systemic improvements to the Summit Platform. This framework is designed to maximize **leverage**—getting more outcome per unit of effort.

## The Leverage Principle

We prioritize improvements that:

1.  **Reduce Decisions**: Eliminate recurrent low-value choices.
2.  **Amplify Intelligence**: Make agents and humans smarter/faster.
3.  **Capture Knowledge**: Turn ephemeral experience into durable artifacts.
4.  **Accelerate Feedback**: Shorten the loop from signal to fix.

## Proposal Process

### 1. Identify Leverage Surface

Use the `scripts/feedback/scan_friction.ts` tool or manual observation to identify:

- Repeated manual steps.
- Recurrent confusion points.
- Frequent "fix" patterns.

### 2. Submit a Proposal

Create an issue or RFC with the label `leverage-proposal`. The proposal must answer:

- **Problem**: What is the recurring cost? (Time, Cognitive Load, Risk)
- **Solution**: How do we eliminate it once and for all?
- **Leverage Ratio**: Estimated Effort vs. Permanent Benefit.

### 3. Verification & Safety

All systemic improvements must:

- Be **Safe**: Preserve existing invariants and security controls.
- Be **Measurable**: Provide a metric for success (e.g., "0 manual steps", "50% faster CI").
- Be **Reversible**: Can we undo it if it breaks flow?

## Automated Improvement Agents

Agents (like Jules) are authorized to propose improvements via this framework. Agents must:

1.  Scan for friction.
2.  Generate a formatted proposal.
3.  Wait for human approval before significant structural changes.

## Governance

- **Review**: The Engineering Council reviews leverage proposals weekly.
- **Veto**: Any change that reduces explainability or increases unmanaged risk will be vetoed.

## Tools

- `make conductor-status`: Check system health.
- `scripts/feedback/scan_friction.ts`: Measure codebase friction.
- `scripts/maintenance/update_prompt_registry.ts`: Automate agent governance.
