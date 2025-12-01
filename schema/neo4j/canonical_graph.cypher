// Canonical Neo4j schema for IntelGraph ingest platform
// Execute via cypher-shell -f canonical_graph.cypher after connecting as admin.

// --- Constraints ---
CREATE CONSTRAINT tenant_tenant_id_unique IF NOT EXISTS
FOR (t:Tenant)
REQUIRE (t.tenant_id) IS UNIQUE;

CREATE CONSTRAINT tenant_dataset_key IF NOT EXISTS
FOR (d:Dataset)
REQUIRE (d.tenant_id, d.dataset_id) IS NODE KEY;

CREATE CONSTRAINT tenant_record_key IF NOT EXISTS
FOR (r:Record)
REQUIRE (r.tenant_id, r.record_id) IS NODE KEY;

CREATE CONSTRAINT tenant_record_hash_unique IF NOT EXISTS
FOR (r:Record)
REQUIRE (r.tenant_id, r.record_hash) IS UNIQUE;

CREATE CONSTRAINT tenant_entity_key IF NOT EXISTS
FOR (e:Entity)
REQUIRE (e.tenant_id, e.entity_id) IS NODE KEY;

CREATE CONSTRAINT tenant_signal_key IF NOT EXISTS
FOR (s:Signal)
REQUIRE (s.tenant_id, s.signal_id) IS NODE KEY;

CREATE CONSTRAINT tenant_event_key IF NOT EXISTS
FOR (e:Event)
REQUIRE (e.tenant_id, e.event_id) IS NODE KEY;

CREATE CONSTRAINT tenant_location_key IF NOT EXISTS
FOR (l:Location)
REQUIRE (l.tenant_id, l.location_id) IS NODE KEY;

CREATE CONSTRAINT tenant_indicator_key IF NOT EXISTS
FOR (i:Indicator)
REQUIRE (i.tenant_id, i.indicator_id) IS NODE KEY;

CREATE CONSTRAINT tenant_provenance_key IF NOT EXISTS
FOR (p:Provenance)
REQUIRE (p.tenant_id, p.prov_id) IS NODE KEY;

// --- Property existence constraints for lineage & governance ---
CREATE CONSTRAINT record_provenance_required IF NOT EXISTS
FOR (r:Record)
REQUIRE (r.ingested_at) IS NOT NULL;

CREATE CONSTRAINT signal_provenance_required IF NOT EXISTS
FOR (s:Signal)
REQUIRE (s.observed_at) IS NOT NULL;

CREATE CONSTRAINT event_time_required IF NOT EXISTS
FOR (e:Event)
REQUIRE (e.first_seen) IS NOT NULL;

// --- Indexes for 1-hop traversal performance ---
CREATE INDEX dataset_ingest_job IF NOT EXISTS
FOR (d:Dataset)
ON (d.tenant_id, d.ingest_job_id);

CREATE INDEX record_ingested_at IF NOT EXISTS
FOR (r:Record)
ON (r.tenant_id, r.ingested_at);

CREATE INDEX record_provenance IF NOT EXISTS
FOR (r:Record)
ON (r.tenant_id, r.provenance_id);

CREATE INDEX signal_observed_at IF NOT EXISTS
FOR (s:Signal)
ON (s.tenant_id, s.observed_at);

CREATE INDEX signal_expires_at IF NOT EXISTS
FOR (s:Signal)
ON (s.tenant_id, s.expires_at);

CREATE INDEX event_last_seen IF NOT EXISTS
FOR (e:Event)
ON (e.tenant_id, e.last_seen);

CREATE INDEX indicator_value IF NOT EXISTS
FOR (i:Indicator)
ON (i.tenant_id, i.value);

CREATE INDEX location_country IF NOT EXISTS
FOR (l:Location)
ON (l.tenant_id, l.country_code);

CREATE FULLTEXT INDEX entity_identifiers_ft IF NOT EXISTS
FOR (e:Entity)
ON EACH [e.display_name, e.entity_type];

CREATE FULLTEXT INDEX indicator_value_ft IF NOT EXISTS
FOR (i:Indicator)
ON EACH [i.value];

// --- Relationship property indexes for lineage ---
CREATE INDEX has_provenance_timestamp IF NOT EXISTS
FOR ()-[hp:HAS_PROVENANCE]-()
ON (hp.added_at);

// --- Sample ingestion-friendly MERGE templates ---
// Record upsert with dedupe and provenance linkage.
// Parameters expected: $tenant_id, $record
// $record = {record_id, record_hash, ingest_job_id, ingested_at, schema_version, purpose_tags, dataset_id,
//            entity_ref, location_ref, signal, provenance}

// Dataset MERGE
MERGE (tenant:Tenant {tenant_id: $tenant_id})
ON CREATE SET tenant.name = $tenant_name,
              tenant.region = $tenant_region,
              tenant.tier = $tenant_tier,
              tenant.created_at = datetime()
WITH tenant
MERGE (dataset:Dataset {tenant_id: tenant.tenant_id, dataset_id: $record.dataset_id})
ON CREATE SET dataset.source_type = $record.source_type,
              dataset.uri = $record.dataset_uri,
              dataset.ingest_job_id = $record.ingest_job_id,
              dataset.retention_tier = $record.retention_tier,
              dataset.checksum = $record.dataset_checksum,
              dataset.purpose_tags = $record.purpose_tags,
              dataset.created_at = datetime()
SET dataset.source_type = coalesce($record.source_type, dataset.source_type)
SET dataset.uri = coalesce($record.dataset_uri, dataset.uri)
SET dataset.ingest_job_id = coalesce($record.ingest_job_id, dataset.ingest_job_id)
SET dataset.retention_tier = coalesce($record.retention_tier, dataset.retention_tier)
SET dataset.checksum = coalesce($record.dataset_checksum, dataset.checksum)
SET dataset.purpose_tags = coalesce($record.purpose_tags, dataset.purpose_tags)
WITH tenant, dataset
MERGE (record:Record {tenant_id: tenant.tenant_id, record_hash: $record.record_hash})
ON CREATE SET record.record_id = $record.record_id,
              record.ingest_job_id = $record.ingest_job_id,
              record.ingested_at = datetime($record.ingested_at),
              record.schema_version = $record.schema_version,
              record.purpose_tags = $record.purpose_tags,
              record.raw_payload_ref = $record.raw_payload_ref
SET record.last_seen_at = datetime()
MERGE (dataset)-[:HAS_RECORD {ingest_job_id: $record.ingest_job_id, added_at: datetime()}]->(record)
// Entity linkage
FOREACH (_ IN CASE WHEN $record.entity_ref IS NULL THEN [] ELSE [1] END |
  MERGE (entity:Entity {tenant_id: tenant.tenant_id, entity_id: $record.entity_ref.entity_id})
  ON CREATE SET entity.entity_type = $record.entity_ref.entity_type,
                entity.display_name = $record.entity_ref.display_name,
                entity.identifiers = $record.entity_ref.identifiers,
                entity.purpose_tags = $record.purpose_tags,
                entity.created_at = datetime()
  SET entity.updated_at = datetime()
  MERGE (record)-[:DESCRIBES {ingest_job_id: $record.ingest_job_id, added_at: datetime()}]->(entity)
);

// Location linkage
FOREACH (_ IN CASE WHEN $record.location_ref IS NULL THEN [] ELSE [1] END |
  MERGE (location:Location {tenant_id: tenant.tenant_id, location_id: $record.location_ref.location_id})
  ON CREATE SET location.location_type = $record.location_ref.location_type,
                location.coordinates = $record.location_ref.coordinates,
                location.country_code = $record.location_ref.country_code,
                location.asn = $record.location_ref.asn,
                location.purpose_tags = $record.purpose_tags,
                location.created_at = datetime()
  SET location.updated_at = datetime()
  MERGE (record)-[:OBSERVED_AT {ingest_job_id: $record.ingest_job_id, added_at: datetime()}]->(location)
);

// Signal + Event linkage
FOREACH (_ IN CASE WHEN $record.signal IS NULL THEN [] ELSE [1] END |
  MERGE (signal:Signal {tenant_id: tenant.tenant_id, signal_id: $record.signal.signal_id})
  ON CREATE SET signal.signal_type = $record.signal.signal_type,
                signal.score = $record.signal.score,
                signal.observed_at = datetime($record.signal.observed_at),
                signal.expires_at = datetime($record.signal.expires_at),
                signal.explainability_ref = $record.signal.explainability_ref,
                signal.purpose_tags = $record.purpose_tags,
                signal.created_at = datetime()
  SET signal.updated_at = datetime(),
      signal.last_seen = datetime()
  MERGE (record)-[:DERIVES {ingest_job_id: $record.ingest_job_id, added_at: datetime()}]->(signal)
  FOREACH (_event IN CASE WHEN $record.signal.event IS NULL THEN [] ELSE [1] END |
    MERGE (event:Event {tenant_id: tenant.tenant_id, event_id: $record.signal.event.event_id})
    ON CREATE SET event.event_type = $record.signal.event.event_type,
                  event.severity = $record.signal.event.severity,
                  event.status = $record.signal.event.status,
                  event.first_seen = datetime($record.signal.event.first_seen),
                  event.last_seen = datetime($record.signal.event.last_seen),
                  event.purpose_tags = $record.purpose_tags,
                  event.created_at = datetime()
    SET event.updated_at = datetime(),
        event.last_seen = datetime($record.signal.event.last_seen)
    MERGE (signal)-[:TRIGGERS {ingest_job_id: $record.ingest_job_id, added_at: datetime()}]->(event)
    FOREACH (_entity IN $record.signal.event.entity_refs |
      MERGE (entity:Entity {tenant_id: tenant.tenant_id, entity_id: _entity.entity_id})
      ON CREATE SET entity.entity_type = _entity.entity_type,
                    entity.display_name = _entity.display_name,
                    entity.identifiers = _entity.identifiers,
                    entity.purpose_tags = $record.purpose_tags,
                    entity.created_at = datetime()
      SET entity.updated_at = datetime()
      MERGE (event)-[:INVOLVES {ingest_job_id: $record.ingest_job_id, added_at: datetime()}]->(entity)
    )
  )
);

// Provenance linkage
FOREACH (_ IN CASE WHEN $record.provenance IS NULL THEN [] ELSE [1] END |
  MERGE (prov:Provenance {tenant_id: tenant.tenant_id, prov_id: $record.provenance.prov_id})
  ON CREATE SET prov.collected_at = datetime($record.provenance.collected_at),
                prov.collector = $record.provenance.collector,
                prov.transform_chain = $record.provenance.transform_chain,
                prov.lineage_uri = $record.provenance.lineage_uri,
                prov.purpose_tags = ['Governance'],
                prov.created_at = datetime()
  SET prov.updated_at = datetime()
  MERGE (record)-[:HAS_PROVENANCE {added_at: datetime(), purpose_tags: ['Governance']}]->(prov)
  FOREACH (_signal IN CASE WHEN $record.signal IS NULL THEN [] ELSE [$record.signal] END |
    MERGE (sigNode:Signal {tenant_id: tenant.tenant_id, signal_id: _signal.signal_id})
    MERGE (sigNode)-[:HAS_PROVENANCE {added_at: datetime(), purpose_tags: ['Governance']}]->(prov)
  )
);

// Indicator linkage
FOREACH (_indicator IN CASE WHEN $record.indicators IS NULL THEN [] ELSE $record.indicators END |
  MERGE (indicator:Indicator {tenant_id: tenant.tenant_id, indicator_id: _indicator.indicator_id})
  ON CREATE SET indicator.indicator_type = _indicator.indicator_type,
                indicator.value = _indicator.value,
                indicator.confidence = _indicator.confidence,
                indicator.valid_from = datetime(_indicator.valid_from),
                indicator.valid_until = datetime(_indicator.valid_until),
                indicator.purpose_tags = ['ThreatHunt'],
                indicator.created_at = datetime()
  SET indicator.updated_at = datetime()
  FOREACH (_entityRef IN CASE
      WHEN _indicator.entity_refs IS NULL OR size(_indicator.entity_refs) = 0 THEN
        CASE WHEN $record.entity_ref IS NULL THEN [] ELSE [$record.entity_ref] END
      ELSE _indicator.entity_refs
    END |
    MERGE (entity:Entity {tenant_id: tenant.tenant_id, entity_id: _entityRef.entity_id})
    ON CREATE SET entity.entity_type = coalesce(_entityRef.entity_type, CASE WHEN $record.entity_ref IS NULL THEN NULL ELSE $record.entity_ref.entity_type END),
                  entity.display_name = coalesce(_entityRef.display_name, CASE WHEN $record.entity_ref IS NULL THEN NULL ELSE $record.entity_ref.display_name END),
                  entity.identifiers = coalesce(_entityRef.identifiers, CASE WHEN $record.entity_ref IS NULL THEN NULL ELSE $record.entity_ref.identifiers END),
                  entity.purpose_tags = $record.purpose_tags,
                  entity.created_at = datetime()
    SET entity.updated_at = datetime()
    MERGE (indicator)-[:MATCHES {ingest_job_id: $record.ingest_job_id, added_at: datetime()}]->(entity)
  )
);

// Optional entity location backfill
FOREACH (_ IN CASE WHEN $record.entity_ref IS NULL OR $record.location_ref IS NULL THEN [] ELSE [1] END |
  MERGE (entityLoc:Entity {tenant_id: tenant.tenant_id, entity_id: $record.entity_ref.entity_id})
  MERGE (locationLoc:Location {tenant_id: tenant.tenant_id, location_id: $record.location_ref.location_id})
  MERGE (entityLoc)-[:LOCATED_IN {ingest_job_id: $record.ingest_job_id, added_at: datetime()}]->(locationLoc)
);
