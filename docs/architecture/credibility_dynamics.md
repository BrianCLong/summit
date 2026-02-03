# Credibility Dynamics: Stability and Aging

## Overview
Credibility is not a static attribute but a dynamic property that evolves based on behavior, challenges, and time.

## Stability-Weighted Credibility
A source's credibility is weighted by its **Stability**—the degree to which its claims remain valid under challenge and correction.

- **Formula**: `BaseScore * StabilityWeight`
- **StabilityWeight**: `1.0 - (0.6 * ErrorRate + 0.4 * ChallengeRate)`
- **Impact**: High-volume sources that frequently require correction will see their credibility automatically downgraded.

## Claim Aging Curves
The certainty of a claim decays over time unless it is corroborated by new evidence.

- **Decay Model**: Exponential decay with a standard half-life of 30 days.
- **Corroboration**: New corroborating evidence resets the aging curve or increases the base score.
- **Revalidation**: Claims that drop below a certain threshold trigger automated re-collection jobs.

## Audit and Provenance
Every change to a credibility score must be recorded in the Provenance Ledger with a pointer to the triggering event (correction, challenge, or aging).
