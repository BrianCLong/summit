# Agentic Vision Evidence Scaffold Prompt (v1)

## Objective

Scaffold the evidence index verification gate, deny fixtures, and required checks discovery updates for the Agentic Vision evidence track.

## Required Outputs

- CI workflow that runs the evidence index validator.
- Evidence index validator script with minimal schema checks.
- Deny fixtures and a self-test runner that asserts validation fails on bad inputs.
- Required checks discovery note update.
- Roadmap status update.

## Constraints

- Keep validation strict on schema and file existence, but avoid breaking legacy evidence formats.
- Do not execute arbitrary code or network calls.
- Use conventional commits and update prompt registry metadata.
