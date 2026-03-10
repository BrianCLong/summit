# Summit Evidence Protocol (SEP)

The Summit Evidence Protocol standardizes how Summit agents and pipelines:
* represent evidence
* verify citations
* link evidence into GraphRAG
* assign and propagate trust
* produce deterministic, machine-verifiable outputs

## Primary Artifacts

* `report.json`
* `metrics.json`
* `stamp.json`
* `evidence-index.json`
* `trust-report.json`

## Required Evidence ID pattern

`EVID:<source-type>:<source-id>:<content-hash>`

Example:
`EVID:sec:10k-2025-acme:7fa92d`
