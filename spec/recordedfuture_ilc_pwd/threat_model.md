# ILC-PWD Threat Model

## Threats

- **Evidence poisoning**: adversary submits fake sightings.
- **Stale evidence**: outdated items inflate confidence.
- **Proof manipulation**: omitting contradictory evidence.
- **Unauthorized exposure**: proof references sensitive evidence.

## Mitigations

- Provenance-weighted decay and source trust scoring.
- Contradiction detection and conflict measures.
- Proof generation under policy-bound evidence bundles.
- Witness chain entries for each lifecycle update.
