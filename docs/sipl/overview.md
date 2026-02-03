# SIPL Overview

The Sequence-Improving Pretraining Loop (SIPL) is a Summit module designed to improve the quality, safety, and factuality of pretrained models by using post-trained models as editors and referees during the pretraining process.

## Key Goals

1.  **Objective Shift**: Move from token-level next-token prediction to a suffix/sequence improvement objective.
2.  **Teacher-in-the-loop**: Use strong post-trained models to guide the pretraining process.
3.  **Safety & Factuality**: Explicitly optimize for safety and factuality metrics using a judge model.

## Implementation Details

The implementation follows a clean-room approach based on the behaviors described in arXiv:2601.21343.

### Candidate Generation

At each step, SIPL takes a prefix and an original suffix, then generates:
- A rewritten suffix (using a teacher model).
- Multiple rollouts (samples) from the current policy.

### Judging and Update

A judge model scores all candidates. The model is then updated using either:
- **Online DPO**: Pairing the best and worst candidates for preference training.
- **RF-NLL**: Applying a negative log-likelihood update on the best candidate.

## Feature Flags

SIPL is gated by the `SIPL_ENABLED` environment variable.
Additional flags control specific features:
- `SIPL_ROLLOUTS`: Number of rollouts to generate.
- `SIPL_CURRICULUM`: Enables adaptive curriculum for shifting from rewrites to rollouts.
