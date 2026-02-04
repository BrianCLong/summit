// Covert Coordination and Laundering Detection Schema Extension
// Execute via cypher-shell -f covert-coordination.cypher after connecting as admin.

// --- Constraints ---

CREATE CONSTRAINT artifact_id_unique IF NOT EXISTS
FOR (a:NarrativeArtifact)
REQUIRE (a.artifact_id) IS UNIQUE;

CREATE CONSTRAINT pattern_id_unique IF NOT EXISTS
FOR (p:CoordinationPattern)
REQUIRE (p.pattern_id) IS UNIQUE;

CREATE CONSTRAINT laundering_stage_id_unique IF NOT EXISTS
FOR (s:LaunderingStage)
REQUIRE (s.stage_id) IS UNIQUE;

// --- Indexes ---

CREATE INDEX artifact_content_hash IF NOT EXISTS
FOR (a:NarrativeArtifact)
ON (a.content_hash);

CREATE INDEX artifact_type IF NOT EXISTS
FOR (a:NarrativeArtifact)
ON (a.type);

CREATE INDEX pattern_type IF NOT EXISTS
FOR (p:CoordinationPattern)
ON (p.type);

CREATE INDEX pattern_detected_at IF NOT EXISTS
FOR (p:CoordinationPattern)
ON (p.detected_at);

CREATE INDEX laundering_stage_name IF NOT EXISTS
FOR (s:LaunderingStage)
ON (s.name);

// --- Sample Ingestion MERGE Templates ---

// 1. Ingest Narrative Artifact and link to Record
// Parameters: $artifact, $record_id
// $artifact = {artifact_id, type, content_hash, stego_features}
// MERGE (record:Record {record_id: $record_id}) -- assumes record exists
// MERGE (artifact:NarrativeArtifact {artifact_id: $artifact.artifact_id})
// ON CREATE SET artifact.type = $artifact.type,
//               artifact.content_hash = $artifact.content_hash,
//               artifact.stego_features = $artifact.stego_features,
//               artifact.created_at = datetime()
// MERGE (record)-[:CONTAINS_ARTIFACT {added_at: datetime()}]->(artifact);

// 2. Link Similar Artifacts
// Parameters: $source_artifact_id, $target_artifact_id, $similarity_score
// MERGE (source:NarrativeArtifact {artifact_id: $source_artifact_id})
// MERGE (target:NarrativeArtifact {artifact_id: $target_artifact_id})
// MERGE (source)-[:SIMILAR_TO {score: $similarity_score, detected_at: datetime()}]->(target);

// 3. Record Coordination Pattern
// Parameters: $pattern, $participant_entity_ids, $artifact_ids
// $pattern = {pattern_id, type, confidence, detected_at}
// MERGE (pattern:CoordinationPattern {pattern_id: $pattern.pattern_id})
// ON CREATE SET pattern.type = $pattern.type,
//               pattern.confidence = $pattern.confidence,
//               pattern.detected_at = datetime($pattern.detected_at)
//
// FOREACH (entity_id IN $participant_entity_ids |
//   MERGE (entity:Entity {entity_id: entity_id})
//   MERGE (entity)-[:SUSPECTED_PARTICIPANT]->(pattern)
// )
//
// FOREACH (artifact_id IN $artifact_ids |
//   MERGE (artifact:NarrativeArtifact {artifact_id: artifact_id})
//   MERGE (pattern)-[:UTILIZED]->(artifact)
// );

// 4. Define Laundering Stages (Static Setup)
// MERGE (seed:LaunderingStage {stage_id: 'ls-seed', name: 'SEEDING', description: 'Initial placement in fringe networks'})
// MERGE (amp:LaunderingStage {stage_id: 'ls-amp', name: 'AMPLIFICATION', description: 'Boosting via botnets or influencers'})
// MERGE (legit:LaunderingStage {stage_id: 'ls-legit', name: 'LEGITIMIZATION', description: 'Pickup by semi-legitimate news sources'})
// MERGE (main:LaunderingStage {stage_id: 'ls-main', name: 'MAINSTREAMING', description: 'Broad public dissemination'})
// MERGE (seed)-[:NEXT_STAGE]->(amp)
// MERGE (amp)-[:NEXT_STAGE]->(legit)
// MERGE (legit)-[:NEXT_STAGE]->(main);
