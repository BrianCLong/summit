# Multimodal Data Schema Guide

## Overview

The IntelGraph Multimodal Data Schema is a P0 Critical MVP1 feature that enables extraction, storage, and analysis of entities and relationships from multiple data modalities including text, images, audio, and video. This schema extends the existing IntelGraph data model to support cross-modal intelligence operations.

## Key Features

### 1. Media Source Management

- **Unified Storage**: Central repository for all media types (text, image, audio, video, documents)
- **Metadata Preservation**: Complete metadata tracking including EXIF data, timestamps, and provenance
- **Quality Assessment**: Automated quality scoring for media sources
- **Deduplication**: Content-based deduplication using cryptographic checksums

### 2. Cross-Modal Entity Extraction

- **Multiple Extractors**: Support for various extraction pipelines (spaCy, Transformers, Computer Vision, OCR, Speech-to-Text)
- **Confidence Scoring**: Multi-level confidence assessment with verification workflows
- **Spatial Context**: Bounding boxes for image/video entities, geographic coordinates
- **Temporal Context**: Time-bound entities for audio/video with transcript support

### 3. Cross-Modal Matching

- **Similarity Detection**: Advanced algorithms for finding entities across different media types
- **Semantic Clustering**: Grouping related entities based on semantic similarity
- **Relationship Inference**: Cross-modal relationship discovery and validation

### 4. Quality and Verification

- **Human Verification**: Workflow for expert validation of extracted entities
- **Quality Metrics**: Comprehensive scoring including accuracy, consistency, and completeness
- **Duplicate Detection**: Advanced similarity matching to identify and merge duplicates

## Schema Components

### Core Types

#### MediaSource

Represents any uploaded media file:

```graphql
type MediaSource {
  id: ID!
  uri: String!
  mediaType: MediaType! # TEXT, IMAGE, AUDIO, VIDEO, DOCUMENT, etc.
  mimeType: String!
  filename: String
  filesize: Int
  quality: MediaQuality!
  checksum: String! # SHA-256 hash for deduplication
  uploadedAt: DateTime!
  metadata: JSON! # EXIF, duration, dimensions, etc.
}
```

#### MultimodalEntity

Extended entity with multimodal support:

```graphql
type MultimodalEntity {
  id: ID!
  type: EntityType!
  label: String!
  confidence: Float!
  confidenceLevel: ConfidenceLevel! # VERY_LOW to HUMAN_VERIFIED
  # Multimodal extraction context
  extractedFrom: [MediaSource!]! # Source media files
  extractionMethod: ExtractionMethod! # Which pipeline extracted this
  boundingBoxes: [BoundingBox!]! # Location in images/video
  temporalBounds: [TemporalBound!]! # Time ranges in audio/video
  spatialContext: SpatialContext # Geographic location
  # Cross-modal linking
  crossModalMatches: [CrossModalMatch!]!
  verified: Boolean!
}
```

#### ExtractionJob

Tracks processing pipeline execution:

```graphql
type ExtractionJob {
  id: ID!
  mediaSourceId: ID!
  extractionMethods: [ExtractionMethod!]!
  status: ProcessingStatus! # PENDING, IN_PROGRESS, COMPLETED, FAILED
  progress: Float! # 0.0 to 1.0
  entitiesExtracted: Int!
  relationshipsExtracted: Int!
  results: ExtractionResults
}
```

### Extraction Methods

The system supports multiple extraction pipelines:

#### Text Processing

- **NLP_SPACY**: Named Entity Recognition using spaCy
- **NLP_TRANSFORMERS**: Advanced NER using HuggingFace transformers
- **OCR_TESSERACT**: Text extraction from images/documents

#### Visual Processing

- **COMPUTER_VISION**: Object detection and recognition in images/video
- **VIDEO_ANALYSIS**: Temporal analysis of video content

#### Audio Processing

- **SPEECH_TO_TEXT**: Speech recognition with entity extraction

#### Hybrid Processing

- **AI_HYBRID**: Combined AI approaches for maximum accuracy

### Cross-Modal Features

#### CrossModalMatch

Links entities found in different media types:

```graphql
type CrossModalMatch {
  matchedEntityId: ID!
  sourceMediaType: MediaType!
  targetMediaType: MediaType!
  similarity: Float! # 0.0 to 1.0
  confidence: Float!
  matchingFeatures: [String!]! # What features matched
  algorithm: String! # Matching algorithm used
}
```

#### Spatial and Temporal Context

- **BoundingBox**: Precise location within images/video (normalized coordinates)
- **TemporalBound**: Time ranges within audio/video content
- **SpatialContext**: Geographic coordinates and metadata

## Usage Examples

### 1. Upload and Process Media

```graphql
# Upload a video file
mutation UploadVideo {
  uploadMedia(
    input: {
      uri: "/uploads/surveillance_video.mp4"
      mediaType: VIDEO
      mimeType: "video/mp4"
      filename: "surveillance_video.mp4"
      metadata: {
        duration: 3600
        resolution: "1920x1080"
        camera_location: "Building A Entrance"
      }
    }
  ) {
    id
    uri
    mediaType
  }
}

# Start extraction job
mutation ExtractEntities {
  startExtractionJob(
    input: {
      mediaSourceId: "media123"
      extractionMethods: [COMPUTER_VISION, SPEECH_TO_TEXT]
      investigationId: "inv456"
    }
  ) {
    id
    status
    progress
  }
}
```

### 2. Query Cross-Modal Entities

```graphql
# Find entities across different media types
query CrossModalSearch {
  multimodalSearch(
    input: {
      query: "suspicious individual"
      mediaTypes: [IMAGE, VIDEO, AUDIO]
      minConfidence: 0.7
      includeCrossModal: true
      investigationId: "inv456"
    }
  ) {
    entities {
      id
      label
      confidence
      extractionMethod
      extractedFrom {
        mediaType
        filename
      }
      crossModalMatches {
        similarity
        sourceMediaType
        targetMediaType
      }
    }
  }
}
```

### 3. Verify and Merge Entities

```graphql
# Verify an extracted entity
mutation VerifyEntity {
  verifyMultimodalEntity(id: "entity789", verified: true) {
    id
    verified
    verifiedAt
  }
}

# Merge duplicate entities
mutation MergeDuplicates {
  mergeMultimodalEntities(
    primaryId: "entity789"
    secondaryIds: ["entity790", "entity791"]
  ) {
    id
    label
    crossModalMatches {
      similarity
    }
  }
}
```

## Database Schema (Neo4j)

### Node Labels

- `MediaSource`: Uploaded media files
- `MultimodalEntity` (extends `Entity`): Extracted entities
- `ExtractionJob`: Processing pipeline tracking
- `ExtractionProvenance`: Extraction metadata
- `CrossModalMatch`: Cross-modal entity matches
- `Evidence`: Supporting evidence for relationships

### Relationships

- `EXTRACTED_FROM`: Entity → MediaSource
- `HAS_CROSS_MODAL_MATCH`: Entity → CrossModalMatch
- `HAS_PROVENANCE`: Entity → ExtractionProvenance
- `PROCESSES`: ExtractionJob → MediaSource
- `EXTRACTED`: ExtractionJob → Entity/Relationship

### Indexes and Constraints

Key indexes for performance:

```cypher
# Entity search optimization
CREATE INDEX multimodal_entity_type_confidence
FOR (e:MultimodalEntity) ON (e.type, e.confidence);

# Cross-modal matching
CREATE INDEX cross_modal_match_similarity
FOR (c:CrossModalMatch) ON (c.similarity);

# Temporal queries
CREATE INDEX multimodal_relationship_temporal_range
FOR (r:MultimodalRelationship) ON (r.validFrom, r.validTo);

# Full-text search
CALL db.index.fulltext.createNodeIndex(
  "multimodalEntitySearch",
  ["MultimodalEntity"],
  ["label", "description"]
);
```

## Integration Points

### 1. War Room Sync

Multimodal entities integrate seamlessly with the War Room Graph Sync system, enabling real-time collaboration on cross-modal intelligence.

### 2. Federated Search

The Federated Search API includes multimodal entity support, allowing queries across distributed IntelGraph instances with media type filtering.

### 3. AI Pipelines

The schema serves as the foundation for AI-based entity extraction pipelines, providing standardized interfaces for multiple extraction methods.

## Quality Assurance

### Confidence Levels

- **VERY_LOW** (0.0-0.4): Requires immediate review
- **LOW** (0.4-0.6): Needs verification before use
- **MEDIUM** (0.6-0.8): Generally reliable
- **HIGH** (0.8-0.9): High confidence, minimal review needed
- **VERY_HIGH** (0.9-1.0): Extremely reliable
- **HUMAN_VERIFIED**: Expert-verified ground truth

### Quality Metrics

- **Extraction Accuracy**: Precision and recall of entity extraction
- **Cross-Modal Consistency**: Agreement between different modalities
- **Temporal Consistency**: Coherence across time-based media
- **Duplicate Rate**: Percentage of duplicate entities detected
- **Verification Rate**: Percentage of entities human-verified

## Performance Considerations

### Scalability

- Asynchronous processing for large media files
- Parallel extraction across multiple methods
- Efficient similarity matching with approximate algorithms
- Caching of frequently accessed cross-modal matches

### Storage Optimization

- Content-based deduplication using SHA-256 checksums
- Compressed storage for bounding boxes and temporal bounds
- Efficient encoding of similarity matrices

## Security and Privacy

### Access Control

- Role-based access to sensitive media sources
- Investigation-scoped entity visibility
- Audit trails for all verification actions

### Data Protection

- Secure media storage with encryption at rest
- PII detection and masking capabilities
- Configurable retention policies

## Future Enhancements

### Advanced AI Features

- **Semantic Embeddings**: Vector representations for semantic similarity
- **Multi-modal Transformers**: Joint processing of multiple modalities
- **Active Learning**: Human-in-the-loop improvement of extraction models

### Enhanced Analytics

- **Temporal Analysis**: Evolution of entities across time
- **Social Network Analysis**: Relationship patterns across modalities
- **Anomaly Detection**: Cross-modal inconsistency detection

## Implementation Status

✅ **Completed (MVP1)**

- Core multimodal schema design
- Basic extraction pipeline framework
- Cross-modal matching foundation
- GraphQL API implementation

🔄 **In Progress**

- Advanced similarity algorithms
- Production extraction pipelines
- Quality metrics dashboard

📋 **Planned**

- Semantic embedding integration
- Advanced temporal analysis
- Multi-modal transformer support

This multimodal schema provides the foundation for IntelGraph's cross-modal intelligence capabilities, enabling analysts to extract insights from diverse data sources in a unified, scalable manner.
