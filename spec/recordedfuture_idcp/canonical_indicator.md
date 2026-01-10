# Canonical Indicator

## Fields

- `canonical_id`
- `indicator_value`
- `equivalence_classes[]`
- `collision_annotations[]`
- `collision_proof_ref`
- `replay_token`
- `commitment_root`

## Output Rules

- Canonical indicator objects are cached by indicator value + replay token.
- Any collision annotation requires a safe action envelope.
