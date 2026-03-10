# Supply Chain Artifact Contracts and Interoperability

## Imports Supported
The Summit Supply Chain integration targets standard ingestion formats:
* SPDX
* CycloneDX
* in-toto attestations
* Cosign verification outputs
* SLSA provenance

## Exports Provided
The deterministic outputs mapped to the graph relationships:
* `report.json`
* `metrics.json`
* `stamp.json`

## Evidence ID Conventions
Every generated finding and decision mapped across the outputs uses:
`EVID:<source-type>:<stable-hash>`

Example: `EVID:attestation:4f2c9a1d`

## Non-goals
* Embedding full raw SBOM documents into `report.json`.
* Storing raw signature blobs in the deterministic models.
* Implementing separate and distinct external signature verifiers.
