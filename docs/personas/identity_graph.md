# Adversarial Persona Identity Graph

## Commander's Intent
Implement an Identity Graph that represents adversarial personas, cross-platform accounts, and deception signals as first-class entities. This provides Summit with a defensive framework for tracking persona hypothesis.

## Concept
The Identity Graph models "personas" as hypotheses rather than real-world people. A `PersonaHypothesis` aggregates `PlatformAccount` instances via `PersonaLink` structures.
We track deception properties like `ANTI_LINKAGE_TACTICS` or `PERSONA_ARMY` on the persona level, and compute metrics such as the number of platforms and total accounts. Contradictory evidence (e.g. mismatched timezones) can shift links into a contested (`CONTRADICTED_LINK`) state.

## Defensive Attribution (Not Doxxing)
This module and the broader Persona ecosystem is strictly for **defensive intelligence**, attributing multi-platform adversary operations. The system uses arbitrary identifiers (`persona_123`) rather than attempting to resolve real-world personal information. The goal is mapping adversarial behavior, not targeting human beings.

## Abuse Analysis
- **Misuse Risk:** Persona graphs could be misused to target or dox individuals across the internet.
- **Design Constraint:** System enforces internal-only hypothetical IDs, defensive framing, restricted surfaces, and intentionally does not externalize real-world identity data resolution.
