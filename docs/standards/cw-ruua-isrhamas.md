# Standard: cw-ruua-isrhamas comparison pack

## Purpose

Define the deterministic, evidence-bound standard for the `cw-ruua-isrhamas` comparison pack. The
standard governs how Summit represents cognitive warfare campaigns across the Russia–Ukraine and
Israel–Hamas conflicts without adjudicating truth or intent.

## Authority

- Summit Readiness Assertion: `docs/SUMMIT_READINESS_ASSERTION.md`.
- Governance Constitution: `docs/governance/CONSTITUTION.md`.
- Claim anchors: `data/packs/cw-ruua-isrhamas/ground_truth.md`.

## Dimensions

Each dimension must map to at least one Evidence ID per conflict entry. Evidence IDs follow the
pattern in `pack.yaml`.

### Horizon & tempo

Definition: The time horizon and cadence of the campaign.

Example indicators:
- Persistence across multiple years vs event-shock spikes.
- Sustained multi-channel operations vs short-lived surges.

### Strategic goals

Definition: The stated or implied strategic objectives of the campaign.

Example indicators:
- Legitimacy shaping and freedom-of-action constraints.
- Alliance cohesion or elite-splitting pressure.

### Core narratives

Definition: The dominant storylines, frames, or interpretive lenses applied to the conflict.

Example indicators:
- Parallel-reality construction or competing historical narratives.
- Delegitimization narratives directed at audiences or institutions.

### Tactics & channels

Definition: The delivery mechanisms and operational tactics used to distribute narratives.

Example indicators:
- Social media amplification, coordinated proxy channels.
- Hostage leverage narratives and staged visual artifacts.

### Target audiences

Definition: The primary audiences targeted by the campaign.

Example indicators:
- Domestic populations vs international publics.
- Policy elites, diaspora communities, or undecided segments.

### Cognitive levers

Definition: The cognitive biases or psychological levers intentionally invoked.

Example indicators:
- Emotional salience, fear, moral outrage, fatigue.
- Confusion, ambiguity, or trust erosion patterns.

### Outcome patterns

Definition: The measurable or observable outcomes tied to the campaign’s trajectory.

Example indicators:
- Sustained international support vs rapid legitimacy shocks.
- Narrative drift indicating shifts in campaign emphasis.

## Evidence rules

- Every non-trivial assertion must include at least one Evidence ID.
- Evidence IDs must map to an ITEM claim or `summit_original` in the claim registry.
- Evidence IDs are immutable once published; any correction is additive with a new ID.
- Evidence IDs are not optional, even for derived summaries.

## Determinism rules

- Stable ordering for dimensions, conflicts, and sources.
- No timestamps or non-deterministic data in outputs.
- Outputs must be byte-identical across repeated runs.

## Non-goals

- Truth arbitration, propaganda labeling, or sentiment policing.
- Automated attribution of intent beyond evidence-bound claims.
- Social scraping or collection without explicit, configured corpora.

## Change control

- Any modifications require evidence updates and claim registry alignment.
- Revisions must preserve backward compatibility of Evidence IDs.
