# PII and Provenance Tagging Documentation

## Overview

This document outlines the system for tagging Personally Identifiable Information (PII) and tracking data provenance within the Summit/IntelGraph platform. This system is designed to be lightweight, extensible, and easy to integrate into new and existing data ingestion pipelines.

## PII Tagging

### Schema

The PII tagging schema is defined in `server/src/lib/pii/types.ts`. It consists of a `PiiCategory` enum and a `PiiClassification` interface.

-   **`PiiCategory`**: An enum that defines the sensitivity of the PII. The possible values are `NONE`, `LOW`, `SENSITIVE`, and `HIGHLY_SENSITIVE`.
-   **`PiiClassification`**: An interface that defines the PII classification for a field. It includes the `category` and an optional `confidence` score.

### Usage

The `server/src/lib/pii/utils.ts` file provides helper functions for working with PII tags.

-   `tagPiiField(fieldName: string, category: PiiCategory, confidence?: number): PiiTaggedField`: Creates a PII tag for a field.
-   `getPiiClassification(taggedFields: PiiTaggedField[], fieldName: string): PiiClassification | undefined`: Retrieves the PII classification for a field.

## Provenance Tagging

### Schema

The provenance tagging schema is defined in `server/src/lib/provenance/types.ts`. It consists of a `ProvenanceMetadata` interface.

-   **`ProvenanceMetadata`**: An interface that defines the provenance of a data record. It includes the `sourceSystem`, `sourceIdentifier`, `ingestJobId`, `ingestTimestamp`, `trustLevel`, and `dataOwner`.

### Usage

The `server/src/lib/provenance/utils.ts` file provides helper functions for working with provenance metadata.

-   `createProvenance(sourceSystem: string, sourceIdentifier: string, ingestJobId: string, trustLevel: number, dataOwner: string): ProvenanceMetadata`: Creates a provenance metadata object.
-   `attachProvenance<T extends object>(record: T, provenance: ProvenanceMetadata): T & { provenance: ProvenanceMetadata }`: Attaches provenance to an object.

## How to Use in Ingestion Pipelines

When creating or updating an ingestion pipeline, you should use the helper utilities to attach PII and provenance metadata to the data you are processing. This metadata should be stored alongside the data, either in a separate field or as part of the data itself.

For an example of how to use this system, see the `gcs.ts` connector and the `gcs-consumer.ts` consumer.
