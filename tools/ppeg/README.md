# PPEG

The Provenance-Preserving ETL Generator (PPEG) turns declarative YAML specs into
fully-instrumented ETL pipelines. Generated pipelines:

- produce byte-identical outputs for the provided fixtures;
- track per-step hashes, dataset fingerprints, and policy version stamps; and
- emit attestation events that can be forwarded to AGQL.

## Usage

```bash
ppeg generate path/to/spec.yaml --out-dir build/pipeline
python build/pipeline/pipeline.py
```

Compare provenance logs between runs with:

```bash
ppeg diff outputs/prev/provenance.json outputs/new/provenance.json
```

See `tests/` for golden fixtures and integration tests demonstrating the
provenance trail reconstruction guarantees.
