// Threat Hunting Cypher Templates
// These templates power the agentic hunt query system
// Each template supports parameterization for LLM-driven hunting

// =============================================================================
// LATERAL MOVEMENT DETECTION
// =============================================================================

// Template: lateral_movement_chain
// Detects multi-hop lateral movement patterns through the network
// Parameters: $start_entity, $max_hops, $time_window_hours
MATCH path = (source:Entity {id: $start_entity})-[:CONNECTED_TO|ACCESSED|AUTHENTICATED*1..$max_hops]->(target:Entity)
WHERE source <> target
  AND ALL(r IN relationships(path) WHERE
    r.timestamp > datetime() - duration({hours: $time_window_hours})
  )
WITH path, source, target,
     [r IN relationships(path) | r.timestamp] AS timestamps,
     [n IN nodes(path) | n.risk_score] AS risk_scores
WHERE size(timestamps) >= 2
  AND reduce(total = 0.0, score IN risk_scores | total + score) / size(risk_scores) > 0.6
RETURN source.id AS source_id,
       source.name AS source_name,
       target.id AS target_id,
       target.name AS target_name,
       length(path) AS hop_count,
       timestamps AS activity_timeline,
       reduce(total = 0.0, score IN risk_scores | total + score) / size(risk_scores) AS avg_risk_score
ORDER BY avg_risk_score DESC, hop_count DESC
LIMIT 50

// =============================================================================
// CREDENTIAL ACCESS ANOMALIES
// =============================================================================

// Template: credential_spray_detection
// Identifies potential credential spraying attacks
// Parameters: $threshold_failures, $time_window_minutes, $unique_target_threshold
MATCH (actor:Entity)-[auth:AUTHENTICATED]->(target:Entity)
WHERE auth.timestamp > datetime() - duration({minutes: $time_window_minutes})
  AND auth.status = 'FAILED'
WITH actor,
     count(DISTINCT target) AS unique_targets,
     count(*) AS total_attempts,
     collect(DISTINCT target.id) AS target_ids,
     min(auth.timestamp) AS first_attempt,
     max(auth.timestamp) AS last_attempt
WHERE total_attempts >= $threshold_failures
  AND unique_targets >= $unique_target_threshold
RETURN actor.id AS actor_id,
       actor.name AS actor_name,
       actor.type AS actor_type,
       unique_targets,
       total_attempts,
       target_ids[0..10] AS sample_targets,
       duration.between(first_attempt, last_attempt).minutes AS attack_duration_minutes,
       toFloat(total_attempts) / unique_targets AS attempts_per_target
ORDER BY total_attempts DESC

// Template: privilege_escalation_chain
// Detects privilege escalation through permission grants
// Parameters: $time_window_hours
MATCH (user:Entity {type: 'USER'})-[grant:GRANTED_PERMISSION]->(role:Entity {type: 'ROLE'})
WHERE grant.timestamp > datetime() - duration({hours: $time_window_hours})
WITH user, role, grant
MATCH (role)-[:HAS_PERMISSION]->(permission:Entity {type: 'PERMISSION'})
WHERE permission.level IN ['ADMIN', 'ELEVATED', 'SENSITIVE']
WITH user,
     collect(DISTINCT role.name) AS elevated_roles,
     collect(DISTINCT permission.name) AS sensitive_permissions,
     min(grant.timestamp) AS first_grant
OPTIONAL MATCH (user)-[:MEMBER_OF]->(group:Entity {type: 'GROUP'})
RETURN user.id AS user_id,
       user.name AS user_name,
       elevated_roles,
       sensitive_permissions,
       collect(DISTINCT group.name) AS group_memberships,
       first_grant AS escalation_timestamp
ORDER BY size(sensitive_permissions) DESC

// =============================================================================
// DATA EXFILTRATION PATTERNS
// =============================================================================

// Template: data_staging_detection
// Identifies potential data staging for exfiltration
// Parameters: $data_volume_threshold_mb, $time_window_hours, $file_count_threshold
MATCH (actor:Entity)-[access:ACCESSED]->(resource:Entity {type: 'FILE'})
WHERE access.timestamp > datetime() - duration({hours: $time_window_hours})
  AND access.operation IN ['READ', 'COPY', 'DOWNLOAD']
WITH actor,
     count(DISTINCT resource) AS files_accessed,
     sum(resource.size_bytes) / (1024.0 * 1024.0) AS total_mb,
     collect(DISTINCT resource.path)[0..20] AS sample_paths,
     collect(DISTINCT resource.classification) AS classifications
WHERE files_accessed >= $file_count_threshold
   OR total_mb >= $data_volume_threshold_mb
RETURN actor.id AS actor_id,
       actor.name AS actor_name,
       files_accessed,
       round(total_mb, 2) AS total_data_mb,
       sample_paths,
       classifications,
       CASE
         WHEN 'SECRET' IN classifications OR 'TOP_SECRET' IN classifications THEN 'CRITICAL'
         WHEN 'CONFIDENTIAL' IN classifications THEN 'HIGH'
         ELSE 'MEDIUM'
       END AS sensitivity_level
ORDER BY total_mb DESC

// Template: unusual_destination_exfil
// Detects data transfers to unusual external destinations
// Parameters: $time_window_hours, $baseline_destinations
MATCH (internal:Entity)-[transfer:TRANSFERRED_DATA]->(external:Entity)
WHERE transfer.timestamp > datetime() - duration({hours: $time_window_hours})
  AND external.is_external = true
  AND NOT external.id IN $baseline_destinations
WITH external,
     count(DISTINCT internal) AS unique_sources,
     sum(transfer.bytes) / (1024.0 * 1024.0) AS total_mb,
     collect(DISTINCT internal.id)[0..10] AS source_entities,
     collect(DISTINCT transfer.protocol) AS protocols
RETURN external.id AS destination_id,
       external.name AS destination_name,
       external.geo_location AS geo_location,
       external.reputation_score AS reputation,
       unique_sources,
       round(total_mb, 2) AS data_volume_mb,
       source_entities,
       protocols
ORDER BY total_mb DESC

// =============================================================================
// PERSISTENCE MECHANISMS
// =============================================================================

// Template: persistence_mechanism_scan
// Identifies established persistence mechanisms
// Parameters: $time_window_days
MATCH (actor:Entity)-[created:CREATED|MODIFIED]->(artifact:Entity)
WHERE created.timestamp > datetime() - duration({days: $time_window_days})
  AND artifact.type IN ['SCHEDULED_TASK', 'SERVICE', 'REGISTRY_KEY', 'STARTUP_SCRIPT', 'CRON_JOB']
OPTIONAL MATCH (artifact)-[:EXECUTES]->(payload:Entity {type: 'EXECUTABLE'})
OPTIONAL MATCH (payload)-[:COMMUNICATES_WITH]->(c2:Entity {is_external: true})
RETURN actor.id AS actor_id,
       actor.name AS actor_name,
       artifact.type AS persistence_type,
       artifact.name AS artifact_name,
       artifact.path AS artifact_path,
       payload.hash AS payload_hash,
       payload.signature_status AS signature_status,
       c2.id AS potential_c2,
       c2.reputation_score AS c2_reputation,
       created.timestamp AS creation_time
ORDER BY created.timestamp DESC

// =============================================================================
// COMMAND AND CONTROL DETECTION
// =============================================================================

// Template: beaconing_pattern_detection
// Identifies C2 beaconing patterns through network traffic analysis
// Parameters: $time_window_hours, $min_beacon_count, $jitter_tolerance
MATCH (internal:Entity)-[conn:CONNECTED_TO]->(external:Entity {is_external: true})
WHERE conn.timestamp > datetime() - duration({hours: $time_window_hours})
WITH internal, external,
     collect(conn.timestamp) AS connection_times,
     collect(conn.bytes_sent) AS bytes_sent_list,
     count(*) AS connection_count
WHERE connection_count >= $min_beacon_count
WITH internal, external, connection_times, bytes_sent_list, connection_count,
     [i IN range(1, size(connection_times)-1) |
       duration.between(connection_times[i-1], connection_times[i]).seconds
     ] AS intervals
WHERE size(intervals) > 0
WITH internal, external, connection_count, intervals, bytes_sent_list,
     reduce(sum = 0, i IN intervals | sum + i) / size(intervals) AS avg_interval,
     reduce(sum = 0, b IN bytes_sent_list | sum + b) AS total_bytes
WHERE avg_interval > 0
WITH internal, external, connection_count, avg_interval, total_bytes,
     [i IN intervals WHERE abs(i - avg_interval) / avg_interval <= $jitter_tolerance] AS consistent_intervals
WHERE toFloat(size(consistent_intervals)) / size(intervals) > 0.7
RETURN internal.id AS source_id,
       internal.name AS source_name,
       external.id AS destination_id,
       external.ip_address AS destination_ip,
       external.domain AS destination_domain,
       connection_count,
       round(avg_interval, 2) AS avg_interval_seconds,
       round(toFloat(size(consistent_intervals)) / connection_count, 2) AS beacon_consistency,
       total_bytes AS total_bytes_sent,
       external.reputation_score AS destination_reputation
ORDER BY beacon_consistency DESC, connection_count DESC

// =============================================================================
// THREAT ACTOR INFRASTRUCTURE MAPPING
// =============================================================================

// Template: infrastructure_mapping
// Maps threat actor infrastructure relationships
// Parameters: $actor_id, $depth
MATCH path = (actor:Entity {id: $actor_id})-[*1..$depth]-(related)
WHERE related.type IN ['IP_ADDRESS', 'DOMAIN', 'EMAIL', 'CERTIFICATE', 'MALWARE_SAMPLE', 'TOOL']
WITH path, related,
     [r IN relationships(path) | type(r)] AS relationship_types,
     length(path) AS distance
UNWIND nodes(path) AS node
WITH DISTINCT related, relationship_types, distance,
     collect(DISTINCT node.type) AS node_types_in_path
RETURN related.id AS related_id,
       related.type AS related_type,
       related.name AS related_name,
       related.first_seen AS first_seen,
       related.last_seen AS last_seen,
       related.confidence AS confidence,
       relationship_types,
       distance,
       node_types_in_path
ORDER BY distance, related.confidence DESC

// Template: diamond_model_analysis
// Performs Diamond Model threat analysis
// Parameters: $indicator_id
MATCH (indicator:Entity {id: $indicator_id})
OPTIONAL MATCH (indicator)<-[:USES]-(adversary:Entity {type: 'THREAT_ACTOR'})
OPTIONAL MATCH (indicator)-[:TARGETS]->(victim:Entity)
OPTIONAL MATCH (indicator)-[:DELIVERED_VIA]->(infrastructure:Entity)
OPTIONAL MATCH (adversary)-[:HAS_CAPABILITY]->(capability:Entity)
RETURN indicator.id AS indicator_id,
       indicator.type AS indicator_type,
       indicator.value AS indicator_value,
       collect(DISTINCT {
         id: adversary.id,
         name: adversary.name,
         attribution_confidence: adversary.attribution_confidence
       }) AS adversaries,
       collect(DISTINCT {
         id: victim.id,
         sector: victim.sector,
         country: victim.country
       }) AS victims,
       collect(DISTINCT {
         id: infrastructure.id,
         type: infrastructure.type,
         location: infrastructure.geo_location
       }) AS infrastructure,
       collect(DISTINCT capability.name) AS capabilities

// =============================================================================
// SUPPLY CHAIN ATTACK DETECTION
// =============================================================================

// Template: supply_chain_compromise
// Identifies potential supply chain compromise indicators
// Parameters: $time_window_days
MATCH (vendor:Entity {type: 'VENDOR'})-[:SUPPLIES]->(software:Entity {type: 'SOFTWARE'})
MATCH (software)-[:DEPLOYED_ON]->(system:Entity)
WHERE software.last_update > datetime() - duration({days: $time_window_days})
OPTIONAL MATCH (software)-[:CONTAINS]->(component:Entity {type: 'COMPONENT'})
WHERE component.vulnerability_count > 0 OR component.is_compromised = true
OPTIONAL MATCH (system)-[anomaly:EXHIBITED_ANOMALY]->(behavior:Entity)
WHERE anomaly.timestamp > software.last_update
RETURN vendor.id AS vendor_id,
       vendor.name AS vendor_name,
       vendor.trust_score AS vendor_trust,
       software.id AS software_id,
       software.name AS software_name,
       software.version AS software_version,
       software.last_update AS update_timestamp,
       collect(DISTINCT {
         component: component.name,
         vulnerabilities: component.vulnerability_count
       }) AS suspicious_components,
       collect(DISTINCT {
         system: system.id,
         behavior: behavior.description
       }) AS anomalous_behaviors
ORDER BY vendor.trust_score ASC

// =============================================================================
// INSIDER THREAT INDICATORS
// =============================================================================

// Template: insider_threat_indicators
// Detects potential insider threat behavioral patterns
// Parameters: $user_id, $time_window_days, $baseline_hours_start, $baseline_hours_end
MATCH (user:Entity {id: $user_id, type: 'USER'})-[action]->(resource:Entity)
WHERE action.timestamp > datetime() - duration({days: $time_window_days})
WITH user,
     collect({
       action: type(action),
       resource: resource.id,
       resource_type: resource.type,
       timestamp: action.timestamp,
       hour: action.timestamp.hour
     }) AS all_actions
WITH user, all_actions,
     [a IN all_actions WHERE a.hour < $baseline_hours_start OR a.hour > $baseline_hours_end] AS off_hours_actions,
     [a IN all_actions WHERE a.resource_type IN ['SENSITIVE_FILE', 'DATABASE', 'CREDENTIAL_STORE']] AS sensitive_accesses
RETURN user.id AS user_id,
       user.name AS user_name,
       user.department AS department,
       user.termination_date AS termination_date,
       size(all_actions) AS total_actions,
       size(off_hours_actions) AS off_hours_activity_count,
       size(sensitive_accesses) AS sensitive_access_count,
       round(toFloat(size(off_hours_actions)) / size(all_actions), 2) AS off_hours_ratio,
       [a IN sensitive_accesses | a.resource][0..10] AS sensitive_resources_accessed
ORDER BY off_hours_ratio DESC, sensitive_access_count DESC
