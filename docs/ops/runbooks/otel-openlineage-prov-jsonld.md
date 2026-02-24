# Runbook: Provenance Context Drift Detection

## Triage failing check `prov-context-validate`
A failure means one of the following:
1. **Schema invalid**: The generated JSON-LD context does not match `schemas/prov-context.schema.json`.
2. **Canonical drift**: The mapping has changed, resulting in a different URDNA2015 hash.
3. **Generator mismatch**: The committed `spec/prov_context.jsonld` is out of sync with `mappings/otel_to_prov.yml`.

## How to reproduce locally
1. Install dependencies:
   ```bash
   pip install -r ci/requirements-prov.txt
   ```
2. Run generator:
   ```bash
   python ci/generate_prov_context.py
   ```
3. Run validator:
   ```bash
   python ci/validate_prov_context.py
   ```

## How to update mapping safely
1. Change `mappings/otel_to_prov.yml`.
2. Run `python ci/generate_prov_context.py`.
3. Run `python ci/validate_prov_context.py`.
4. Inspect the new hashes in `artifacts/prov_context_check.json`.
5. Commit all changes.
