// IOC (Indicators of Compromise) Query Templates
// Optimized for high-precision threat hunting with LLM orchestration

// =============================================================================
// IOC ENRICHMENT AND CORRELATION
// =============================================================================

// Template: ioc_network_enrichment
// Enriches network IOCs with graph context
// Parameters: $ioc_value, $ioc_type (IP|DOMAIN|URL|HASH)
MATCH (ioc:Entity {value: $ioc_value, type: $ioc_type})
OPTIONAL MATCH (ioc)<-[:RESOLVED_TO]-(domain:Entity {type: 'DOMAIN'})
OPTIONAL MATCH (ioc)-[:ASSOCIATED_WITH]->(campaign:Entity {type: 'CAMPAIGN'})
OPTIONAL MATCH (ioc)<-[:USES]-(actor:Entity {type: 'THREAT_ACTOR'})
OPTIONAL MATCH (ioc)-[:OBSERVED_IN]->(incident:Entity {type: 'INCIDENT'})
OPTIONAL MATCH (internal:Entity {is_internal: true})-[comm:COMMUNICATED_WITH]->(ioc)
RETURN ioc.value AS ioc_value,
       ioc.type AS ioc_type,
       ioc.first_seen AS first_seen,
       ioc.last_seen AS last_seen,
       ioc.confidence AS confidence,
       ioc.source AS intel_source,
       collect(DISTINCT domain.name) AS resolved_domains,
       collect(DISTINCT {
         campaign: campaign.name,
         active: campaign.is_active
       }) AS associated_campaigns,
       collect(DISTINCT {
         actor: actor.name,
         attribution_confidence: actor.attribution_confidence
       }) AS attributed_actors,
       collect(DISTINCT incident.id) AS related_incidents,
       count(DISTINCT internal) AS internal_communications,
       max(comm.timestamp) AS last_internal_contact

// Template: ioc_hash_analysis
// Analyzes file hash IOCs for malware relationships
// Parameters: $hash_value, $hash_type (MD5|SHA1|SHA256)
MATCH (hash:Entity {value: $hash_value, hash_type: $hash_type})
OPTIONAL MATCH (hash)-[:INSTANCE_OF]->(malware:Entity {type: 'MALWARE_FAMILY'})
OPTIONAL MATCH (hash)-[:DROPS|DOWNLOADS]->(payload:Entity)
OPTIONAL MATCH (hash)-[:CONNECTS_TO]->(c2:Entity {type: 'C2_SERVER'})
OPTIONAL MATCH (hash)-[:EXPLOITS]->(vuln:Entity {type: 'VULNERABILITY'})
OPTIONAL MATCH (hash)<-[:SUBMITTED]-(source:Entity)
OPTIONAL MATCH (hash)-[:DETECTED_BY]->(av:Entity {type: 'AV_SIGNATURE'})
RETURN hash.value AS hash_value,
       hash.hash_type AS hash_type,
       hash.file_name AS file_name,
       hash.file_size AS file_size,
       hash.first_submission AS first_seen,
       hash.detection_ratio AS detection_ratio,
       malware.name AS malware_family,
       malware.category AS malware_category,
       collect(DISTINCT payload.hash) AS dropped_payloads,
       collect(DISTINCT c2.value) AS c2_servers,
       collect(DISTINCT vuln.cve_id) AS exploited_cves,
       collect(DISTINCT av.signature_name) AS av_detections,
       count(DISTINCT source) AS submission_count

// Template: ioc_bulk_lookup
// Batch lookup for multiple IOCs with correlation
// Parameters: $ioc_list (array of IOC values)
UNWIND $ioc_list AS ioc_value
MATCH (ioc:Entity)
WHERE ioc.value = ioc_value OR ioc.hash = ioc_value OR ioc.ip_address = ioc_value
OPTIONAL MATCH (ioc)-[r]-(related:Entity)
WHERE related.type IN ['THREAT_ACTOR', 'CAMPAIGN', 'MALWARE_FAMILY', 'INCIDENT']
WITH ioc, collect({
  related_id: related.id,
  related_type: related.type,
  relationship: type(r),
  confidence: r.confidence
}) AS correlations
RETURN ioc.value AS ioc_value,
       ioc.type AS ioc_type,
       ioc.confidence AS threat_confidence,
       ioc.severity AS severity,
       ioc.last_seen AS last_seen,
       ioc.tags AS tags,
       correlations[0..10] AS top_correlations,
       size(correlations) AS total_correlations

// =============================================================================
// IOC TIMELINE AND PROGRESSION
// =============================================================================

// Template: ioc_timeline_analysis
// Builds temporal view of IOC activity
// Parameters: $ioc_id, $time_window_days
MATCH (ioc:Entity {id: $ioc_id})
MATCH (ioc)-[activity]-(entity:Entity)
WHERE activity.timestamp > datetime() - duration({days: $time_window_days})
WITH ioc, activity, entity,
     date(activity.timestamp) AS activity_date,
     type(activity) AS activity_type
ORDER BY activity.timestamp
WITH ioc,
     collect({
       date: activity_date,
       type: activity_type,
       entity_id: entity.id,
       entity_type: entity.type,
       timestamp: activity.timestamp
     }) AS timeline
RETURN ioc.id AS ioc_id,
       ioc.value AS ioc_value,
       ioc.type AS ioc_type,
       size(timeline) AS total_events,
       timeline[0].timestamp AS first_activity,
       timeline[-1].timestamp AS last_activity,
       [t IN timeline | t.date] AS active_dates,
       apoc.map.groupBy(timeline, 'type') AS events_by_type

// Template: ioc_spread_analysis
// Analyzes how an IOC has spread across the environment
// Parameters: $ioc_id, $time_window_hours
MATCH (ioc:Entity {id: $ioc_id})
MATCH path = (ioc)-[*1..3]-(affected:Entity {is_internal: true})
WHERE ALL(r IN relationships(path) WHERE
  r.timestamp > datetime() - duration({hours: $time_window_hours})
)
WITH ioc, affected, path,
     [r IN relationships(path) | r.timestamp] AS timestamps
ORDER BY timestamps[0]
WITH ioc,
     collect(DISTINCT {
       entity_id: affected.id,
       entity_type: affected.type,
       entity_name: affected.name,
       first_contact: timestamps[0],
       path_length: length(path)
     }) AS spread_timeline
RETURN ioc.id AS ioc_id,
       ioc.value AS ioc_value,
       size(spread_timeline) AS total_affected,
       spread_timeline[0..5] AS first_affected,
       spread_timeline[-5..] AS most_recent_affected,
       [s IN spread_timeline | s.entity_type] AS affected_types

// =============================================================================
// IOC HUNTING QUERIES
// =============================================================================

// Template: hunt_similar_iocs
// Finds similar IOCs based on behavioral patterns
// Parameters: $reference_ioc_id, $similarity_threshold
MATCH (ref:Entity {id: $reference_ioc_id})
MATCH (ref)-[r1]->(connected:Entity)
WITH ref, collect({type: type(r1), target_type: connected.type}) AS ref_patterns
MATCH (candidate:Entity)
WHERE candidate.id <> ref.id
  AND candidate.type = ref.type
MATCH (candidate)-[r2]->(connected2:Entity)
WITH ref, ref_patterns, candidate,
     collect({type: type(r2), target_type: connected2.type}) AS candidate_patterns
WITH ref, candidate, ref_patterns, candidate_patterns,
     [p IN ref_patterns WHERE p IN candidate_patterns] AS matching_patterns
WHERE toFloat(size(matching_patterns)) / size(ref_patterns) >= $similarity_threshold
RETURN candidate.id AS similar_ioc_id,
       candidate.value AS similar_ioc_value,
       candidate.type AS similar_ioc_type,
       candidate.confidence AS confidence,
       round(toFloat(size(matching_patterns)) / size(ref_patterns), 2) AS similarity_score,
       matching_patterns AS shared_patterns
ORDER BY similarity_score DESC
LIMIT 20

// Template: hunt_by_ttp
// Hunts for entities exhibiting specific TTPs
// Parameters: $ttp_id (MITRE ATT&CK ID), $time_window_days
MATCH (ttp:Entity {mitre_id: $ttp_id, type: 'TTP'})
MATCH (ttp)<-[:EXHIBITS]-(entity:Entity)
WHERE entity.type IN ['PROCESS', 'USER', 'HOST', 'MALWARE_SAMPLE']
OPTIONAL MATCH (entity)-[activity]->(target:Entity)
WHERE activity.timestamp > datetime() - duration({days: $time_window_days})
WITH entity, ttp,
     collect(DISTINCT {
       target: target.id,
       target_type: target.type,
       activity: type(activity),
       timestamp: activity.timestamp
     }) AS recent_activity
RETURN entity.id AS entity_id,
       entity.type AS entity_type,
       entity.name AS entity_name,
       ttp.name AS ttp_name,
       ttp.mitre_id AS mitre_id,
       ttp.tactic AS tactic,
       size(recent_activity) AS activity_count,
       recent_activity[0..5] AS sample_activity
ORDER BY activity_count DESC

// Template: hunt_infrastructure_overlap
// Identifies infrastructure overlap between campaigns
// Parameters: $time_window_days
MATCH (c1:Entity {type: 'CAMPAIGN'})-[:USES]->(infra:Entity)-[:USES]-(c2:Entity {type: 'CAMPAIGN'})
WHERE c1.id < c2.id
  AND (c1.last_active > datetime() - duration({days: $time_window_days})
       OR c2.last_active > datetime() - duration({days: $time_window_days}))
WITH c1, c2, collect(DISTINCT infra) AS shared_infra
WHERE size(shared_infra) >= 2
RETURN c1.id AS campaign_1_id,
       c1.name AS campaign_1_name,
       c2.id AS campaign_2_id,
       c2.name AS campaign_2_name,
       size(shared_infra) AS shared_infrastructure_count,
       [i IN shared_infra | {id: i.id, type: i.type, value: i.value}][0..10] AS sample_shared_infra,
       CASE
         WHEN size(shared_infra) >= 5 THEN 'HIGH'
         WHEN size(shared_infra) >= 3 THEN 'MEDIUM'
         ELSE 'LOW'
       END AS correlation_strength
ORDER BY shared_infrastructure_count DESC

// =============================================================================
// OSINT INTEGRATION QUERIES
// =============================================================================

// Template: osint_entity_enrichment
// Enriches entities with OSINT data
// Parameters: $entity_id
MATCH (entity:Entity {id: $entity_id})
OPTIONAL MATCH (entity)-[:HAS_OSINT]->(osint:Entity {type: 'OSINT_REPORT'})
OPTIONAL MATCH (entity)-[:MENTIONED_IN]->(article:Entity {type: 'NEWS_ARTICLE'})
OPTIONAL MATCH (entity)-[:APPEARS_IN]->(paste:Entity {type: 'PASTE'})
OPTIONAL MATCH (entity)-[:LISTED_ON]->(blocklist:Entity {type: 'BLOCKLIST'})
OPTIONAL MATCH (entity)<-[:ANALYZES]-(sandbox:Entity {type: 'SANDBOX_REPORT'})
RETURN entity.id AS entity_id,
       entity.type AS entity_type,
       entity.value AS entity_value,
       collect(DISTINCT {
         source: osint.source,
         date: osint.published_date,
         confidence: osint.confidence
       }) AS osint_reports,
       collect(DISTINCT {
         title: article.title,
         source: article.source,
         date: article.published_date
       }) AS news_mentions,
       collect(DISTINCT {
         site: paste.site,
         date: paste.discovery_date
       }) AS paste_appearances,
       collect(DISTINCT blocklist.name) AS blocklist_entries,
       collect(DISTINCT {
         sandbox: sandbox.name,
         verdict: sandbox.verdict,
         score: sandbox.threat_score
       }) AS sandbox_results

// Template: cti_feed_correlation
// Correlates entity against CTI feeds
// Parameters: $entity_value
MATCH (feed:Entity {type: 'CTI_FEED'})-[:CONTAINS]->(ioc:Entity)
WHERE ioc.value = $entity_value
   OR ioc.hash = $entity_value
   OR ioc.ip_address = $entity_value
   OR ioc.domain = $entity_value
WITH feed, ioc,
     feed.reliability AS reliability,
     feed.last_updated AS feed_updated
RETURN feed.name AS feed_name,
       feed.provider AS provider,
       feed.reliability AS reliability_rating,
       feed.category AS feed_category,
       ioc.confidence AS ioc_confidence,
       ioc.severity AS severity,
       ioc.tags AS tags,
       ioc.first_seen AS first_seen,
       ioc.last_seen AS last_seen,
       feed.last_updated AS feed_last_updated
ORDER BY reliability DESC, ioc.confidence DESC
