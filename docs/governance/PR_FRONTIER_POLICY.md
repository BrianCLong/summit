# PR Frontier Policy

## Purpose

Summit must converge work through a single canonical pull request per concern cluster.

This policy exists to prevent:
- duplicate PR accumulation
- retry-PR proliferation
- stale parallel implementations
- merge queue congestion
- governance ambiguity about which PR is the intended survivor

## Core Rule

For any materially overlapping line of work, there must be exactly one active frontier PR.

That PR is labeled:

- `canonical-survivor`

All overlapping PRs must be placed into one of these states:

- `superseded`
- `supersedence:pending-close`
- `supersedence:review`
- `do-not-supersede`

## Definitions

### Concern cluster

A set of PRs that overlap in intent, subsystem, or effective change set.

### Canonical survivor

The single PR selected as the preferred merge frontier for a concern cluster.

### Superseded PR

A PR whose useful work is believed to be contained or obviated by the canonical survivor.

## Required Labels

### Active frontier
- `canonical-survivor`

### Non-survivor states
- `superseded`
- `supersedence:pending-close`
- `supersedence:review`

### Protection / exception
- `do-not-supersede`

## Policy Requirements

### 1. One active frontier per concern
A concern cluster must not have more than one open PR labeled `canonical-survivor`.

### 2. Overlapping PRs must transition out of the frontier
Non-survivor PRs must be labeled into an explicit non-frontier state.

### 3. Only canonical survivors may be auto-enqueued
Automation may enqueue only PRs labeled `canonical-survivor`.

### 4. Protected PRs are exempt
Any PR labeled `do-not-supersede` is exempt from automatic closure.
