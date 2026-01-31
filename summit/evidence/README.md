# Summit Evidence Bundles

Deterministic evidence artifacts for CI + audit.

Required per Evidence ID directory:

- `report.json`: Contains summary, environment, backend info, and artifact list.
- `metrics.json`: Contains numeric or boolean metrics.
- `stamp.json`: Contains timestamps and run identifiers (timestamps allowed only here).

Schemas are located in `schemas/`:
- `report.schema.json`
- `metrics.schema.json`
- `stamp.schema.json`
- `index.schema.json`

## Index

The file `index.json` provides a sample mapping of Evidence IDs to file paths.
The global evidence index is located at `/evidence/index.json`.

## Examples

Example bundles are located in `examples/`:
- `EVD-ATP-LATENT-EVIDENCE-001`: Schema definitions.
- `EVD-ATP-LATENT-EVIDENCE-002`: Example run bundle.

Templates for new evidence bundles live in `templates/`.
