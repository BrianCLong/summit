# Evidence System (Composer 1.5 Era)

This document describes the evidence system used for governance, compliance, and auditing of agentic workflows.

## Core Concepts

The evidence system ensures that every agent run produces a verifiable, structured bundle of artifacts that prove:
1.  What the agent did (plan, actions).
2.  What constraints were respected (policy checks).
3.  What resources were touched (files, APIs).

## Evidence IDs

Evidence IDs follow the format: `EVD-composer15-<AREA>-<NNN>`.

Examples:
- `EVD-composer15-EVIDENCE-001`: Schema presence
- `EVD-composer15-EVIDENCE-002`: Timestamp isolation

## Required Artifacts

Every run must produce the following files in the `evidence/` directory:

1.  `evidence/index.json`: Manifest mapping IDs to files.
2.  `evidence/report.json`: Human-readable summary + findings.
3.  `evidence/metrics.json`: Structured counters and timings.
4.  `evidence/stamp.json`: The **only** place timestamps are allowed.

## System Implementation

The evidence system is implemented in `src/agents/evidence/`.

### Schemas

The system uses minimal runtime schemas defined in `src/agents/evidence/schemas.ts` to validate artifacts before writing them.

### Writing Evidence

Use `writeEvidenceBundle` from `src/agents/evidence/writeEvidence.ts` to generate the required artifacts in a consistent manner.
