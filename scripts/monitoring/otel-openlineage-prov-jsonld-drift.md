# Monitoring: Provenance Context Drift

## Purpose
This monitor ensures that the generated `spec/prov_context.jsonld` remains deterministic and in sync with the mapping in `mappings/otel_to_prov.yml`.

## What it checks
1. **Generator Consistency**: Runs the generator and checks if the output matches the committed file.
2. **Validator Health**: Runs the full validation suite (schemas + canonicalization).

## How to interpret failures
- If the monitor fails, it means either a change was made to the mapping without updating the generated context, or the generation process has become non-deterministic.
- Check the CI logs for a diff of `spec/prov_context.jsonld`.
