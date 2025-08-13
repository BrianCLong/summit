// Multimodal Data Schema - Neo4j Constraints and Indexes
// P0 Critical - MVP1 requirement for cross-modal entity extraction support

// ===== CONSTRAINTS =====

// MediaSource Constraints
CREATE CONSTRAINT media_source_id IF NOT EXISTS FOR (m:MediaSource) REQUIRE m.id IS UNIQUE;
CREATE CONSTRAINT media_source_uri IF NOT EXISTS FOR (m:MediaSource) REQUIRE m.uri IS UNIQUE;
CREATE CONSTRAINT media_source_checksum IF NOT EXISTS FOR (m:MediaSource) REQUIRE m.checksum IS UNIQUE;

// MultimodalEntity Constraints (extends existing Entity)
CREATE CONSTRAINT multimodal_entity_id IF NOT EXISTS FOR (e:MultimodalEntity) REQUIRE e.id IS UNIQUE;
CREATE CONSTRAINT multimodal_entity_uuid IF NOT EXISTS FOR (e:MultimodalEntity) REQUIRE e.uuid IS UNIQUE;

// MultimodalRelationship Constraints
CREATE CONSTRAINT multimodal_relationship_id IF NOT EXISTS FOR (r:MultimodalRelationship) REQUIRE r.id IS UNIQUE;
CREATE CONSTRAINT multimodal_relationship_uuid IF NOT EXISTS FOR (r:MultimodalRelationship) REQUIRE r.uuid IS UNIQUE;

// ExtractionJob Constraints
CREATE CONSTRAINT extraction_job_id IF NOT EXISTS FOR (j:ExtractionJob) REQUIRE j.id IS UNIQUE;

// ExtractionProvenance Constraints
CREATE CONSTRAINT extraction_provenance_id IF NOT EXISTS FOR (p:ExtractionProvenance) REQUIRE p.id IS UNIQUE;

// CrossModalMatch Constraints
CREATE CONSTRAINT cross_modal_match_id IF NOT EXISTS FOR (c:CrossModalMatch) REQUIRE c.id IS UNIQUE;

// Evidence Constraints
CREATE CONSTRAINT evidence_id IF NOT EXISTS FOR (e:Evidence) REQUIRE e.id IS UNIQUE;

// SemanticCluster Constraints
CREATE CONSTRAINT semantic_cluster_id IF NOT EXISTS FOR (s:SemanticCluster) REQUIRE s.id IS UNIQUE;

// ===== INDEXES =====

// MediaSource Indexes
CREATE INDEX media_source_type IF NOT EXISTS FOR (m:MediaSource) ON (m.mediaType);
CREATE INDEX media_source_mime_type IF NOT EXISTS FOR (m:MediaSource) ON (m.mimeType);
CREATE INDEX media_source_uploaded_at IF NOT EXISTS FOR (m:MediaSource) ON (m.uploadedAt);
CREATE INDEX media_source_quality IF NOT EXISTS FOR (m:MediaSource) ON (m.quality);
CREATE INDEX media_source_filesize IF NOT EXISTS FOR (m:MediaSource) ON (m.filesize);

// MultimodalEntity Indexes
CREATE INDEX multimodal_entity_type IF NOT EXISTS FOR (e:MultimodalEntity) ON (e.type);
CREATE INDEX multimodal_entity_label IF NOT EXISTS FOR (e:MultimodalEntity) ON (e.label);
CREATE INDEX multimodal_entity_confidence IF NOT EXISTS FOR (e:MultimodalEntity) ON (e.confidence);
CREATE INDEX multimodal_entity_confidence_level IF NOT EXISTS FOR (e:MultimodalEntity) ON (e.confidenceLevel);
CREATE INDEX multimodal_entity_extraction_method IF NOT EXISTS FOR (e:MultimodalEntity) ON (e.extractionMethod);
CREATE INDEX multimodal_entity_verified IF NOT EXISTS FOR (e:MultimodalEntity) ON (e.verified);
CREATE INDEX multimodal_entity_created_at IF NOT EXISTS FOR (e:MultimodalEntity) ON (e.createdAt);
CREATE INDEX multimodal_entity_updated_at IF NOT EXISTS FOR (e:MultimodalEntity) ON (e.updatedAt);

// Spatial Context Indexes (for entities with location data)
CREATE INDEX multimodal_entity_spatial_lat IF NOT EXISTS FOR (e:MultimodalEntity) ON (e.spatialContext.latitude);
CREATE INDEX multimodal_entity_spatial_lon IF NOT EXISTS FOR (e:MultimodalEntity) ON (e.spatialContext.longitude);

// MultimodalRelationship Indexes
CREATE INDEX multimodal_relationship_type IF NOT EXISTS FOR (r:MultimodalRelationship) ON (r.type);
CREATE INDEX multimodal_relationship_confidence IF NOT EXISTS FOR (r:MultimodalRelationship) ON (r.confidence);
CREATE INDEX multimodal_relationship_confidence_level IF NOT EXISTS FOR (r:MultimodalRelationship) ON (r.confidenceLevel);
CREATE INDEX multimodal_relationship_extraction_method IF NOT EXISTS FOR (r:MultimodalRelationship) ON (r.extractionMethod);
CREATE INDEX multimodal_relationship_verified IF NOT EXISTS FOR (r:MultimodalRelationship) ON (r.verified);
CREATE INDEX multimodal_relationship_valid_from IF NOT EXISTS FOR (r:MultimodalRelationship) ON (r.validFrom);
CREATE INDEX multimodal_relationship_valid_to IF NOT EXISTS FOR (r:MultimodalRelationship) ON (r.validTo);
CREATE INDEX multimodal_relationship_weight IF NOT EXISTS FOR (r:MultimodalRelationship) ON (r.weight);

// ExtractionJob Indexes
CREATE INDEX extraction_job_status IF NOT EXISTS FOR (j:ExtractionJob) ON (j.status);
CREATE INDEX extraction_job_started_at IF NOT EXISTS FOR (j:ExtractionJob) ON (j.startedAt);
CREATE INDEX extraction_job_completed_at IF NOT EXISTS FOR (j:ExtractionJob) ON (j.completedAt);
CREATE INDEX extraction_job_media_source IF NOT EXISTS FOR (j:ExtractionJob) ON (j.mediaSourceId);

// ExtractionProvenance Indexes
CREATE INDEX extraction_provenance_extractor IF NOT EXISTS FOR (p:ExtractionProvenance) ON (p.extractorName);
CREATE INDEX extraction_provenance_method IF NOT EXISTS FOR (p:ExtractionProvenance) ON (p.extractionMethod);
CREATE INDEX extraction_provenance_confidence IF NOT EXISTS FOR (p:ExtractionProvenance) ON (p.confidence);
CREATE INDEX extraction_provenance_processed_at IF NOT EXISTS FOR (p:ExtractionProvenance) ON (p.processedAt);

// CrossModalMatch Indexes
CREATE INDEX cross_modal_match_similarity IF NOT EXISTS FOR (c:CrossModalMatch) ON (c.similarity);
CREATE INDEX cross_modal_match_confidence IF NOT EXISTS FOR (c:CrossModalMatch) ON (c.confidence);
CREATE INDEX cross_modal_match_source_type IF NOT EXISTS FOR (c:CrossModalMatch) ON (c.sourceMediaType);
CREATE INDEX cross_modal_match_target_type IF NOT EXISTS FOR (c:CrossModalMatch) ON (c.targetMediaType);
CREATE INDEX cross_modal_match_computed_at IF NOT EXISTS FOR (c:CrossModalMatch) ON (c.computedAt);

// Evidence Indexes
CREATE INDEX evidence_type IF NOT EXISTS FOR (e:Evidence) ON (e.type);
CREATE INDEX evidence_confidence IF NOT EXISTS FOR (e:Evidence) ON (e.confidence);
CREATE INDEX evidence_relevance_score IF NOT EXISTS FOR (e:Evidence) ON (e.relevanceScore);
CREATE INDEX evidence_extraction_method IF NOT EXISTS FOR (e:Evidence) ON (e.extractionMethod);

// SemanticCluster Indexes
CREATE INDEX semantic_cluster_coherence IF NOT EXISTS FOR (s:SemanticCluster) ON (s.coherence);
CREATE INDEX semantic_cluster_radius IF NOT EXISTS FOR (s:SemanticCluster) ON (s.radius);
CREATE INDEX semantic_cluster_confidence IF NOT EXISTS FOR (s:SemanticCluster) ON (s.confidence);
CREATE INDEX semantic_cluster_dominant_type IF NOT EXISTS FOR (s:SemanticCluster) ON (s.dominantType);

// ===== COMPOSITE INDEXES =====

// Multi-property indexes for complex queries
CREATE INDEX multimodal_entity_type_confidence IF NOT EXISTS FOR (e:MultimodalEntity) ON (e.type, e.confidence);
CREATE INDEX multimodal_entity_method_verified IF NOT EXISTS FOR (e:MultimodalEntity) ON (e.extractionMethod, e.verified);
CREATE INDEX multimodal_relationship_type_confidence IF NOT EXISTS FOR (r:MultimodalRelationship) ON (r.type, r.confidence);
CREATE INDEX extraction_job_status_media IF NOT EXISTS FOR (j:ExtractionJob) ON (j.status, j.mediaSourceId);

// Temporal range indexes for relationships
CREATE INDEX multimodal_relationship_temporal_range IF NOT EXISTS FOR (r:MultimodalRelationship) ON (r.validFrom, r.validTo);

// ===== FULL-TEXT SEARCH INDEXES =====

// Full-text search for entity labels and descriptions
CALL db.index.fulltext.createNodeIndex("multimodalEntitySearch", ["MultimodalEntity"], ["label", "description"], {
  analyzer: "standard-no-stop-words"
}) YIELD name, labels, properties, analyzer;

// Full-text search for relationship labels and descriptions
CALL db.index.fulltext.createNodeIndex("multimodalRelationshipSearch", ["MultimodalRelationship"], ["label", "description"], {
  analyzer: "standard-no-stop-words"
}) YIELD name, labels, properties, analyzer;

// Full-text search for media source metadata
CALL db.index.fulltext.createNodeIndex("mediaSourceSearch", ["MediaSource"], ["filename", "metadata"], {
  analyzer: "standard-no-stop-words"
}) YIELD name, labels, properties, analyzer;

// Full-text search for evidence content
CALL db.index.fulltext.createNodeIndex("evidenceContentSearch", ["Evidence"], ["content"], {
  analyzer: "standard-no-stop-words"
}) YIELD name, labels, properties, analyzer;