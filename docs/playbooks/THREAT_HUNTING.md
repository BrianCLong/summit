# Threat Hunting Playbooks

## Table of Contents

1. [Hypothesis-Driven Hunts](#hypothesis-driven-hunts)
2. [TTP-Based Hunts](#ttp-based-hunts)
3. [Anomaly-Based Hunts](#anomaly-based-hunts)
4. [Intelligence-Driven Hunts](#intelligence-driven-hunts)

## Hypothesis-Driven Hunts

### Hunt 1: Credential Dumping via LSASS

**Hypothesis**: Adversaries are extracting credentials from LSASS process memory

**TTPs**: T1003.001 (LSASS Memory)

**Data Sources**:
- Process creation logs
- File access logs
- Memory access logs

**Hunt Steps**:

1. **Query for LSASS Access**:
   ```sql
   SELECT *
   FROM security_events
   WHERE event_time > NOW() - INTERVAL '7 days'
   AND raw_data->>'process_name' ILIKE '%lsass%'
   AND raw_data->>'access_type' = 'memory_read'
   ORDER BY event_time DESC;
   ```

2. **Identify Suspicious Tools**:
   - Look for: mimikatz, procdump, comsvcs.dll
   - Non-standard debugging tools
   - PowerShell with suspicious parameters

3. **Validate Findings**:
   - Check process lineage
   - Verify user context
   - Review associated network connections

4. **Document Evidence**:
   - Screenshot suspicious processes
   - Collect memory dumps if possible
   - Preserve logs

### Hunt 2: Living-Off-The-Land Binaries (LOLBins)

**Hypothesis**: Adversaries using legitimate Windows binaries for malicious purposes

**TTPs**: T1218 (Signed Binary Proxy Execution)

**Data Sources**:
- Command-line logs
- Process creation
- Network connections

**Suspicious Binaries**:
- certutil.exe (download files)
- bitsadmin.exe (download/upload)
- regsvr32.exe (execute scripts)
- mshta.exe (execute HTA)
- rundll32.exe (execute DLLs)

**Hunt Query**:
```sql
SELECT
    event_time,
    raw_data->>'process_name' as process,
    raw_data->>'command_line' as cmdline,
    user_id,
    source_ip
FROM security_events
WHERE event_time > NOW() - INTERVAL '30 days'
AND (
    raw_data->>'process_name' ILIKE '%certutil%'
    OR raw_data->>'process_name' ILIKE '%bitsadmin%'
    OR raw_data->>'process_name' ILIKE '%regsvr32%'
    OR raw_data->>'process_name' ILIKE '%mshta%'
    OR raw_data->>'process_name' ILIKE '%rundll32%'
)
AND (
    raw_data->>'command_line' ILIKE '%http%'
    OR raw_data->>'command_line' ILIKE '%download%'
    OR raw_data->>'command_line' ILIKE '%/i:%'
)
ORDER BY event_time DESC;
```

## TTP-Based Hunts

### Hunt 3: PowerShell Empire Indicators

**TTPs**: T1059.001 (PowerShell)

**Indicators**:
- Base64 encoded commands
- Download cradles
- Reflective PE injection
- AMSI bypass attempts

**Hunt Query**:
```sql
SELECT *
FROM security_events
WHERE event_time > NOW() - INTERVAL '7 days'
AND raw_data->>'process_name' ILIKE '%powershell%'
AND (
    raw_data->>'command_line' ~* '-[eE]nc(odedCommand)?'
    OR raw_data->>'command_line' ~* 'IEX|Invoke-Expression'
    OR raw_data->>'command_line' ~* 'DownloadString'
    OR raw_data->>'command_line' ~* 'System\.Reflection\.Assembly'
    OR raw_data->>'command_line' ~* 'AmsiUtils'
)
ORDER BY event_time DESC;
```

**Analysis Steps**:
1. Decode base64 commands
2. Analyze PowerShell scripts
3. Check for known Empire stagers
4. Correlate with network connections
5. Identify C2 infrastructure

### Hunt 4: Lateral Movement via RDP

**TTPs**: T1021.001 (Remote Desktop Protocol)

**Data Sources**:
- Authentication logs
- Network connections
- RDP session logs

**Hunt Query**:
```sql
WITH rdp_sessions AS (
    SELECT
        user_id,
        source_ip,
        destination_ip,
        event_time,
        LAG(destination_ip) OVER (PARTITION BY user_id ORDER BY event_time) as prev_dest,
        LEAD(destination_ip) OVER (PARTITION BY user_id ORDER BY event_time) as next_dest
    FROM security_events
    WHERE event_time > NOW() - INTERVAL '24 hours'
    AND threat_category = 'LATERAL_MOVEMENT'
    AND raw_data->>'protocol' = 'RDP'
)
SELECT *
FROM rdp_sessions
WHERE destination_ip != prev_dest
OR destination_ip != next_dest
ORDER BY event_time;
```

## Anomaly-Based Hunts

### Hunt 5: Unusual Data Transfer Volumes

**Hypothesis**: Data exfiltration through abnormal transfer volumes

**Hunt Steps**:

1. **Baseline Calculation**:
   ```sql
   SELECT
       user_id,
       AVG(bytes_transferred) as avg_transfer,
       STDDEV(bytes_transferred) as stddev_transfer
   FROM (
       SELECT
           user_id,
           SUM(bytesTransferred) as bytes_transferred
       FROM security_events
       WHERE event_time > NOW() - INTERVAL '30 days'
       GROUP BY user_id, DATE(event_time)
   ) daily_transfers
   GROUP BY user_id;
   ```

2. **Detect Anomalies**:
   ```sql
   WITH baselines AS (
       -- baseline query from above
   ),
   recent_transfers AS (
       SELECT
           user_id,
           SUM(bytesTransferred) as total_bytes
       FROM security_events
       WHERE event_time > NOW() - INTERVAL '1 day'
       GROUP BY user_id
   )
   SELECT
       r.user_id,
       r.total_bytes,
       b.avg_transfer,
       (r.total_bytes - b.avg_transfer) / b.stddev_transfer as z_score
   FROM recent_transfers r
   JOIN baselines b ON r.user_id = b.user_id
   WHERE ABS((r.total_bytes - b.avg_transfer) / b.stddev_transfer) > 3
   ORDER BY z_score DESC;
   ```

### Hunt 6: Off-Hours Access Patterns

**Hypothesis**: Compromised accounts accessing systems during unusual hours

**Hunt Query**:
```sql
WITH user_patterns AS (
    SELECT
        user_id,
        EXTRACT(HOUR FROM event_time) as hour,
        COUNT(*) as access_count
    FROM security_events
    WHERE event_time > NOW() - INTERVAL '90 days'
    AND event_time < NOW() - INTERVAL '7 days'
    GROUP BY user_id, EXTRACT(HOUR FROM event_time)
),
typical_hours AS (
    SELECT
        user_id,
        ARRAY_AGG(hour) FILTER (WHERE access_count > 10) as normal_hours
    FROM user_patterns
    GROUP BY user_id
)
SELECT
    e.user_id,
    e.event_time,
    e.source_ip,
    e.description
FROM security_events e
JOIN typical_hours t ON e.user_id = t.user_id
WHERE e.event_time > NOW() - INTERVAL '7 days'
AND NOT (EXTRACT(HOUR FROM e.event_time) = ANY(t.normal_hours))
ORDER BY e.event_time DESC;
```

## Intelligence-Driven Hunts

### Hunt 7: Known APT Indicators

**Data Source**: Threat intelligence feeds

**Hunt Steps**:

1. **Query Recent IOCs**:
   ```sql
   SELECT
       indicator_type,
       indicator_value,
       threat_actor,
       malware_family,
       confidence
   FROM threat_intel_indicators
   WHERE first_seen > NOW() - INTERVAL '30 days'
   AND threat_actor IS NOT NULL
   AND confidence > 70
   ORDER BY first_seen DESC;
   ```

2. **Match Against Security Events**:
   ```sql
   SELECT
       e.*,
       i.threat_actor,
       i.malware_family,
       i.confidence
   FROM security_events e
   JOIN threat_intel_indicators i ON (
       (i.indicator_type = 'ip' AND e.source_ip::TEXT = i.indicator_value)
       OR (i.indicator_type = 'ip' AND e.destination_ip::TEXT = i.indicator_value)
       OR (i.indicator_type = 'domain' AND e.raw_data->>'domain' = i.indicator_value)
   )
   WHERE e.event_time > NOW() - INTERVAL '7 days'
   AND i.confidence > 70
   ORDER BY i.confidence DESC, e.event_time DESC;
   ```

### Hunt 8: Cobalt Strike Beacons

**Indicators**:
- Regular beaconing intervals
- Specific user agents
- JA3 SSL fingerprints
- Named pipe patterns

**Hunt Query**:
```sql
WITH connection_intervals AS (
    SELECT
        source_ip,
        destination_ip,
        event_time,
        LAG(event_time) OVER (
            PARTITION BY source_ip, destination_ip
            ORDER BY event_time
        ) as prev_time
    FROM security_events
    WHERE event_time > NOW() - INTERVAL '24 hours'
    AND threat_category = 'C2_COMMUNICATION'
),
regular_intervals AS (
    SELECT
        source_ip,
        destination_ip,
        EXTRACT(EPOCH FROM (event_time - prev_time)) as interval_seconds,
        AVG(EXTRACT(EPOCH FROM (event_time - prev_time))) OVER (
            PARTITION BY source_ip, destination_ip
        ) as avg_interval,
        STDDEV(EXTRACT(EPOCH FROM (event_time - prev_time))) OVER (
            PARTITION BY source_ip, destination_ip
        ) as stddev_interval
    FROM connection_intervals
    WHERE prev_time IS NOT NULL
)
SELECT
    source_ip,
    destination_ip,
    avg_interval,
    stddev_interval,
    COUNT(*) as beacon_count
FROM regular_intervals
WHERE stddev_interval < (avg_interval * 0.1)  -- Low variance = regular
AND avg_interval BETWEEN 30 AND 300  -- 30s to 5min intervals
GROUP BY source_ip, destination_ip, avg_interval, stddev_interval
HAVING COUNT(*) > 10
ORDER BY stddev_interval ASC;
```

## Hunt Workflow

### 1. Preparation

- Define hypothesis
- Identify required data sources
- Prepare query templates
- Set up environment

### 2. Execution

- Run initial queries
- Filter false positives
- Pivot on interesting findings
- Correlate across data sources

### 3. Analysis

- Review suspicious activities
- Context gathering
- Timeline construction
- Attribution analysis

### 4. Documentation

- Record findings
- Create incident tickets
- Update detection rules
- Share lessons learned

### 5. Response

- Notify stakeholders
- Initiate containment
- Execute playbooks
- Monitor for recurrence

## Tools and Techniques

### SQL Queries

Use TimescaleDB's time-series functions:
- `time_bucket()` for aggregation
- `LAG()` and `LEAD()` for sequence analysis
- Window functions for pattern detection
- JSONB operators for metadata queries

### Visualization

- Timeline charts for attack progression
- Network graphs for lateral movement
- Heatmaps for volume analysis
- Geospatial maps for attribution

### Automation

```typescript
// Automated hunt execution
async function executeHunt(hunt: ThreatHunt) {
  const results = [];

  for (const query of hunt.queries) {
    const data = await db.query(query.query);

    if (data.rows.length > 0) {
      const finding = {
        queryId: query.id,
        timestamp: new Date(),
        resultsCount: data.rows.length,
        suspiciousResults: analyzeSuspiciousness(data.rows),
        data: data.rows
      };

      results.push(finding);

      if (finding.suspiciousResults > 0) {
        await createAlert({
          huntId: hunt.id,
          finding: finding,
          severity: calculateSeverity(finding)
        });
      }
    }
  }

  return results;
}
```

## Key Performance Indicators

Track hunt effectiveness:

- **Dwell Time Reduction**: Time between compromise and detection
- **Hunt Success Rate**: Percentage of hunts that find threats
- **False Positive Rate**: Ratio of false to true positives
- **Coverage**: Percentage of MITRE ATT&CK techniques hunted
- **Time to Hunt**: Average time to complete a hunt
- **Threats Prevented**: Number of threats stopped before impact

## Best Practices

1. **Start Broad, Then Narrow**: Begin with high-level queries, then focus
2. **Document Everything**: Record queries, findings, and decisions
3. **Automate Repetitive Hunts**: Convert successful hunts to detection rules
4. **Collaborate**: Work with other analysts, share findings
5. **Stay Current**: Follow threat intelligence, update hunt playbooks
6. **Test Hypotheses**: Validate assumptions with data
7. **Think Like an Adversary**: Use ATT&CK framework for ideas
8. **Maintain Context**: Understand business operations and normal behavior
9. **Iterate**: Refine queries based on results
10. **Close the Loop**: Feed findings back into detection engineering

---

**Remember**: Not all hunts will find threats, but every hunt improves defenses.
