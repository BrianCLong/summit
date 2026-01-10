# Fixture Generation

PGTT produces synthetic graph fixtures that satisfy ontology constraints and target sensitive
policy boundaries.

## Steps

- Solve ontology constraints to produce valid nodes and relations.
- Inject boundary-case values for redaction and purpose checks.
- Bind fixtures to deterministic seeds for replay.
