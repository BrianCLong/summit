# ATP-Latent Master Plan (arXiv:2601.21598)

**Status**: Active scaffold; default-off feature flags enforced.

## Readiness Assertion

This plan is governed by the Summit Readiness Assertion and must align with its readiness gates before any promotion beyond scaffold status. Reference: `docs/SUMMIT_READINESS_ASSERTION.md`.

## Core Objective

Implement a clean-room, governed scaffold for Active Latent Planning (ATP-Latent) derived from the public summary of arXiv:2601.21598: conditional VAE supervision for latent tokens and RL with an auxiliary coherence reward computed from decoded latent contents.

## Single Source of Truth

This document defines the current algorithm sketch, flags, and evidence IDs.

## Interfaces (Frozen After PR2)

- `LatentCodec`: encode/decode latent tokens.
- `LatentSupervisor`: conditional VAE supervision + decoding for reward.
- `TrainerAuxRewardHook`: RL integration hook (planned).

## Feature Flags (Default OFF)

- `LATENT_TRACK=0`
- `COHERENCE_REWARD=0`
- `ATP_RL=0`
- `ATP_EVAL=0`
- `ATP_LATENT=0`
- `LOG_DECODED_LATENTS=0`

## Evidence IDs (ATP-LATENT-2601-21598)

- `EVD-ATP-LATENT-2601-21598-SCHEMA-001`
- `EVD-ATP-LATENT-2601-21598-EVAL-ACC-001`
- `EVD-ATP-LATENT-2601-21598-EVAL-TOK-001`
- `EVD-ATP-LATENT-2601-21598-SAFE-RH-001`
- `EVD-ATP-LATENT-2601-21598-GOV-LOG-001`

## Algorithm Sketch (Clean-Room)

1. Encode reasoning tokens into latent tokens with `LatentCodec`.
2. Supervise latent space using conditional VAE loss (`LatentSupervisor.loss`).
3. Decode latent tokens for auxiliary coherence scoring (`decode_for_reward`).
4. Compute coherence reward via decoded-consistency metric.
5. Train policy with task reward + capped coherence reward (feature-flagged).

## Governance + Security

### Deny-by-Default

- Decoded latent content is sensitive and never logged unless explicitly enabled.
- Evidence artifacts must avoid decoded text unless redacted and authorized.

### MAESTRO Alignment

- **Layers**: Foundation, Data, Agents, Tools, Observability, Security.
- **Threats Considered**: reward hacking, prompt injection via decoded content, tool abuse via logging.
- **Mitigations**: reward caps, coherence-correctness gating, no-log policy, evidence redaction.

## Required Checks Discovery

Use `required_checks.todo.md` to align CI verifier names with branch protection.

## Evaluation Targets

- Accuracy: non-regression baseline with directional improvement.
- Token usage: measure reasoning token delta.
- Coherence-correctness coupling: fail if coherence rises while accuracy falls.

## Rollback Plan

Disable via feature flags; removal is non-invasive and does not alter default behavior.

## Execution Notes

- Benchmark enumeration is **Deferred pending** definitive task list ingestion.
- Reward weighting schedule is **Deferred pending** empirical evals.

## Governance Commitments

- Evidence mapping in `evidence/index.json` must be updated each PR.
- No timestamps outside `stamp.json`.
- Default path tests must remain identical when flags are off.
