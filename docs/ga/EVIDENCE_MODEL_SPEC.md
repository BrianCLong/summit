# Evidence Model Specification

This document defines the core data model for the Evidence-Native system. All artifacts in the system must conform to these schemas.

## Core Primitives

### EvidenceObject

Represents a raw piece of information captured from a source.

| Field | Type | Description |
|---|---|---|
| `id` | String | Unique identifier (usually hash of content). |
| `contentHash` | String | SHA-256 hash of the canonicalized content. |
| `content` | Object | The actual evidence data. |
| `source` | String | Source identifier. |
| `captureMethod` | String | Method of capture. |
| `timestamp` | ISO8601 | Timestamp of capture. |
| `metadata` | Object | Additional metadata. |
| `compartments` | Array<String> | Security compartments. |

### Claim

Represents an assertion derived from evidence.

| Field | Type | Description |
|---|---|---|
| `id` | String | Unique identifier. |
| `subject` | String | Subject of the claim. |
| `predicate` | String | Predicate of the claim. |
| `object` | Any | Object of the claim. |
| `sourceEvidenceIds` | Array<String> | IDs of evidence supporting this claim. |
| `confidence` | Number | Confidence score (0-1). |
| `generatedAt` | ISO8601 | Timestamp of generation. |

### ConflictSet

Represents a detected conflict between claims.

| Field | Type | Description |
|---|---|---|
| `id` | String | Unique identifier. |
| `type` | Enum | `contradiction`, `temporal`, `source_divergence`. |
| `claimIds` | Array<String> | IDs of conflicting claims. |
| `detectedAt` | ISO8601 | Timestamp of detection. |

### TransformReceipt

Represents a verifiable record of a data transformation.

| Field | Type | Description |
|---|---|---|
| `id` | String | Unique identifier. |
| `transformId` | String | ID of the transform applied. |
| `inputEvidenceIds` | Array<String> | IDs of input evidence. |
| `outputHash` | String | Hash of the output. |
| `executedAt` | ISO8601 | Timestamp of execution. |
| `signature` | String | Cryptographic signature (optional). |

### BeliefState

Represents the computed belief in a claim.

| Field | Type | Description |
|---|---|---|
| `claimId` | String | ID of the claim. |
| `beliefScore` | Number | Calculated belief score (0-1). |
| `rationale` | Array<String> | List of evidence/receipt IDs. |
| `updatedAt` | ISO8601 | Timestamp of update. |

## Implementation

These schemas are implemented in `@intelgraph/evidence-model` using Zod.
