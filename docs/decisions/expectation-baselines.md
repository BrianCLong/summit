# Decisions: Expectation Baselines

## Decisions made

- Baselines are versioned artifacts with provenance.
- Pre-content signals are deny-by-default and not implemented in MWS.
- Innovation scoring is feature-flagged OFF by default.

## Alternatives rejected

- Spike/volume-only alerts (misses “should-have-happened” failures).
- Unversioned baseline updates (enables silent normalization).

## Deferred

- Cross-layer alignment engine
- Survivability + elasticity models beyond scaffold

## Risk tradeoffs

- Added CI gates (mitigated with fixtures and clear rollback).
- Potential baseline bias addressed via drift audit requirements.

## GA alignment

- Additive-only, deterministic evidence, machine-verifiable checks.
