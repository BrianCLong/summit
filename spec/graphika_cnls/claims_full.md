# CNLS Full Claim Set

## Independent Claims

1. A computer-implemented method comprising:
   1.1 receiving content items from a plurality of online sources within a time window, each content item comprising at least one of text, media, or a referenced resource;
   1.2 generating for each content item a canonical fingerprint comprising at least one of a text hash, a media perceptual hash, or a normalized resource identifier;
   1.3 constructing a narrative lineage graph comprising nodes representing content items and edges representing lineage relations including at least quoted, remixed, or linked relations derived from the canonical fingerprints;
   1.4 computing a stance representation for at least a subset of the content items;
   1.5 detecting stance drift for a narrative cluster by evaluating changes in the stance representation along at least one lineage path in the narrative lineage graph; and
   1.6 outputting a lineage capsule comprising at least one lineage path, an indication of the stance drift, and a replay token binding the lineage capsule to the time window and a snapshot identifier.

2. A system comprising one or more processors and one or more non-transitory computer-readable media storing instructions that, when executed, cause performance of the method of claim 1.

3. A non-transitory computer-readable medium storing instructions that, when executed, cause performance of the method of claim 1.

## Dependent Claims

4. The method of claim 1, wherein generating the canonical fingerprint comprises locality-sensitive hashing for near-duplicate text detection.
5. The method of claim 1, wherein constructing the narrative lineage graph comprises attributing lineage relations based on shared normalized resource identifiers and temporal ordering constraints.
6. The method of claim 1, wherein computing the stance representation comprises computing an embedding and a stance polarity score conditioned on a target topic.
7. The method of claim 1, wherein detecting stance drift comprises identifying a reframing event when a stance change exceeds a threshold along the lineage path.
8. The method of claim 1, further comprising computing a coordination indicator based on synchronized posting times and shared canonical fingerprints across distinct actors.
9. The method of claim 1, wherein the lineage capsule further comprises provenance references identifying at least one ingestion source for each lineage relation.
10. The method of claim 1, wherein the replay token comprises a seed value, a schema version, and an index version in addition to the snapshot identifier.
11. The method of claim 1, wherein outputting the lineage capsule comprises including a cryptographic commitment to identifiers of included content items via a Merkle root.
12. The system of claim 2, further comprising an execution budget manager that enforces at least one of a maximum expansion count or maximum execution time during lineage path extraction.
13. The system of claim 2, further comprising a trusted execution environment configured to generate an attestation quote bound to a digest of the lineage capsule.

## Definitions

- **Lineage capsule**: a replayable, policy-bounded package containing lineage
  paths, drift indicators, and cryptographic commitments.
- **Stance drift**: a statistically significant change in stance polarity along
  a lineage path within a defined time window.
