# Architecture Decision Records (ADRs)

This directory contains Architecture Decision Records (ADRs) for the Summit project.

## What is an ADR?
An Architecture Decision Record (ADR) is a document that captures an important architectural decision made along with its context and consequences.

## Format
We use a standard format for all ADRs:
- **Title**: A short, descriptive title.
- **Status**: The current status of the decision (e.g., Proposed, Accepted, Deprecated, Superseded).
- **Context**: The context or problem statement that led to the decision.
- **Decision**: The specific decision that was made.
- **Consequences**: The positive and negative consequences of the decision.

## How to Create a New ADR
1. Create a new markdown file in this directory following the naming convention: `ADR-XXX-short-title.md` (e.g., `ADR-008-use-postgres.md`).
2. Use the standard format mentioned above.
3. Submit a pull request with the new ADR for review.

## How to Update an Existing ADR
If a decision changes, do not modify the original ADR directly to rewrite history. Instead:
1. Update the **Status** of the old ADR to "Superseded by ADR-YYY".
2. Create a new ADR (ADR-YYY) detailing the new decision.
3. Add a link to the new ADR in the old ADR, and vice versa.
