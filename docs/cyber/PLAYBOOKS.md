# Cyber Threat Intelligence Playbooks

## Overview

This document contains operational playbooks for threat intelligence analysis, threat hunting, and incident response using the IntelGraph CTI Platform.

## Table of Contents

1. [Threat Intelligence Playbooks](#threat-intelligence-playbooks)
2. [Threat Hunting Playbooks](#threat-hunting-playbooks)
3. [Incident Response Playbooks](#incident-response-playbooks)
4. [Malware Analysis Playbooks](#malware-analysis-playbooks)
5. [Vulnerability Management Playbooks](#vulnerability-management-playbooks)

---

## Threat Intelligence Playbooks

### PLAYBOOK-TI-001: New Threat Feed Onboarding

**Objective:** Integrate and validate a new threat intelligence feed

**Prerequisites:**
- Feed API credentials
- Feed documentation
- Test environment

**Steps:**

1. **Feed Registration**
   ```typescript
   await aggregator.registerFeed({
     id: 'new-feed-001',
     name: 'New Threat Provider',
     source: 'COMMERCIAL',
     url: 'https://api.provider.com/threats',
     apiKey: process.env.FEED_API_KEY,
     refreshInterval: 3600,
     tlp: 'AMBER',
     enabled: false, // Start disabled for testing
     createdAt: new Date().toISOString(),
     updatedAt: new Date().toISOString(),
   });
   ```

2. **Test Sync**
   - Perform initial sync in test mode
   - Validate data format and quality
   - Check for duplicate IOCs

3. **Quality Assessment**
   - Review sample size (minimum 100 indicators)
   - Assess false positive rate (<5% acceptable)
   - Verify confidence scoring
   - Check freshness of data

4. **Integration**
   - Enable feed in production
   - Configure deduplication rules
   - Set up monitoring alerts
   - Document feed characteristics

5. **Validation Period**
   - Monitor for 2 weeks
   - Track detection rate
   - Measure false positive impact
   - Adjust confidence thresholds

**Success Criteria:**
- Feed syncs successfully every hour
- False positive rate < 5%
- At least 3 validated detections in validation period

---

### PLAYBOOK-TI-002: IOC Triage and Enrichment

**Objective:** Process and enrich incoming IOCs

**Trigger:** New IOC detected

**Steps:**

1. **Initial Classification**
   ```typescript
   const ioc = await iocManager.getIOC(iocId);

   // Classify IOC type and priority
   const priority = calculatePriority(ioc);
   ```

2. **Automated Enrichment**
   ```typescript
   const enriched = await enrichment.enrichIOC(ioc, [
     'VIRUSTOTAL',
     'ABUSEIPDB',
     'ALIENVAULT_OTX',
     'SHODAN'
   ]);
   ```

3. **Context Analysis**
   - Check against known campaigns
   - Identify related threat actors
   - Map to MITRE ATT&CK techniques

4. **Risk Scoring**
   ```typescript
   const riskScore = calculateRiskScore({
     severity: ioc.severity,
     confidence: ioc.confidence,
     enrichment: enriched.enrichment,
     prevalence: getPrevalence(ioc.value),
     age: getAge(ioc.firstSeen)
   });
   ```

5. **Distribution**
   - If risk score > 80: Immediate alert to SOC
   - If risk score 50-80: Add to watchlist
   - If risk score < 50: Log for correlation

**Automation:**
```javascript
// Automated enrichment pipeline
async function processNewIOC(ioc) {
  const enriched = await enrichIOC(ioc);
  const risk = await calculateRisk(enriched);

  if (risk > 80) {
    await alertSOC(enriched);
    await blockIOC(enriched);
  } else if (risk > 50) {
    await addToWatchlist(enriched);
  }

  await updateThreatIntel(enriched);
}
```

---

### PLAYBOOK-TI-003: Dark Web Monitoring Response

**Objective:** Respond to dark web findings

**Trigger:** Dark web monitor detects keywords

**Steps:**

1. **Finding Validation**
   - Review automated finding
   - Confirm relevance to organization
   - Assess severity and impact

2. **Content Analysis**
   - Extract IOCs from content
   - Identify threat actors
   - Determine if credentials/data leaked

3. **Impact Assessment**
   - Identify affected systems/users
   - Estimate data exposure
   - Calculate business impact

4. **Response Actions**

   **If Credentials Leaked:**
   - Force password resets for affected accounts
   - Review recent access logs
   - Enable MFA if not already active
   - Monitor for unauthorized access

   **If Data Leaked:**
   - Determine data classification
   - Notify stakeholders
   - Initiate incident response
   - Consider takedown request

   **If Threat Discussion:**
   - Enhance monitoring for mentioned TTPs
   - Review and harden mentioned targets
   - Brief security teams

5. **Documentation**
   - Log finding in threat database
   - Update threat actor profiles
   - Create intelligence report
   - Share with relevant teams

---

## Threat Hunting Playbooks

### PLAYBOOK-HUNT-001: Lateral Movement Detection

**Hypothesis:** Adversary is using PsExec or similar tools for lateral movement

**MITRE ATT&CK:** T1021 (Remote Services), T1570 (Lateral Tool Transfer)

**Data Sources:**
- Windows Event Logs (4624, 4648, 4697, 5140)
- Process Creation Logs
- Network Traffic (SMB, RDP)

**Hunt Steps:**

1. **Query for Service Creation**
   ```sql
   SELECT *
   FROM process_logs
   WHERE process_name IN ('psexec.exe', 'paexec.exe', 'winexesvc.exe')
     OR command_line LIKE '%ADMIN$%'
     OR service_name LIKE '%PSEXESVC%'
   AND timestamp > NOW() - INTERVAL '24 hours'
   ```

2. **Identify Unusual Service Accounts**
   ```sql
   SELECT source_user, COUNT(DISTINCT destination_host) as host_count
   FROM authentication_logs
   WHERE event_id = 4624
     AND logon_type = 3
     AND timestamp > NOW() - INTERVAL '24 hours'
   GROUP BY source_user
   HAVING host_count > 5
   ```

3. **Check for Admin Share Access**
   ```sql
   SELECT source_ip, destination_ip, share_name
   FROM smb_logs
   WHERE share_name IN ('ADMIN$', 'C$', 'IPC$')
     AND timestamp > NOW() - INTERVAL '24 hours'
   ```

4. **Correlate Findings**
   - Cross-reference users accessing multiple admin shares
   - Identify unusual access patterns
   - Check if source IPs are workstations (not servers)

5. **Investigate Suspicious Activity**
   - Review process execution timeline
   - Check for file transfers
   - Examine parent-child process relationships
   - Verify user legitimacy

**Indicators of Compromise:**
- Multiple admin share accesses from single source
- Service creation on multiple hosts
- Unusual account usage patterns
- Process execution from network shares

**Response:**
- Isolate affected systems
- Revoke compromised credentials
- Collect forensic evidence
- Escalate to incident response

---

### PLAYBOOK-HUNT-002: C2 Communication Detection

**Hypothesis:** Compromised systems are communicating with C2 infrastructure

**MITRE ATT&CK:** T1071 (Application Layer Protocol), T1573 (Encrypted Channel)

**Data Sources:**
- Network flow data
- DNS logs
- Proxy logs
- Firewall logs

**Hunt Steps:**

1. **Identify Beaconing Behavior**
   ```python
   # Detect regular intervals (beaconing)
   connections = get_external_connections(hours=24)

   for host in unique_hosts(connections):
       intervals = calculate_intervals(host)

       if is_regular_pattern(intervals):
           alert_beacon(host, intervals)
   ```

2. **Check Domain Generation Algorithms (DGA)**
   ```sql
   SELECT domain, COUNT(*) as query_count
   FROM dns_logs
   WHERE entropy(domain) > 3.5
     AND domain_length > 15
     AND NOT tld IN ('com', 'org', 'net')
   GROUP BY domain
   HAVING query_count < 3
   ```

3. **Analyze TLS Certificates**
   ```sql
   SELECT dest_ip, ssl_subject, ssl_issuer
   FROM tls_logs
   WHERE ssl_issuer NOT IN (known_ca_list)
     OR ssl_subject LIKE '%localhost%'
     OR days_until_expiry < 7
   ```

4. **Detect Fast Flux**
   ```python
   # Multiple IPs for same domain in short period
   dns_records = get_dns_records(hours=24)

   for domain in unique_domains(dns_records):
       ip_changes = count_ip_changes(domain, window_hours=1)

       if ip_changes > 10:
           alert_fast_flux(domain, ip_changes)
   ```

5. **Hunt for Known C2 IOCs**
   ```typescript
   // Sweep network for known C2 indicators
   await huntingService.sweepIOCs({
     iocs: c2_indicators,
     scope: 'network',
     lookback_hours: 168 // 7 days
   });
   ```

**Automation:**
```javascript
// Automated C2 detection
async function detectC2() {
  const beacons = await detectBeaconing();
  const dga = await detectDGA();
  const suspiciousTLS = await analyzeTLS();

  const findings = [...beacons, ...dga, ...suspiciousTLS];

  for (const finding of findings) {
    await enrichFinding(finding);
    await correlateThreatIntel(finding);
    await createAlert(finding);
  }
}
```

---

### PLAYBOOK-HUNT-003: Data Exfiltration Hunt

**Hypothesis:** Adversary is exfiltrating data via covert channels

**MITRE ATT&CK:** T1048 (Exfiltration Over Alternative Protocol), T1567 (Exfiltration Over Web Service)

**Data Sources:**
- Network traffic analysis
- DNS logs
- Cloud service logs
- Email logs

**Hunt Steps:**

1. **Detect Large Outbound Transfers**
   ```sql
   SELECT source_ip, destination_ip, SUM(bytes_out) as total_bytes
   FROM netflow
   WHERE timestamp > NOW() - INTERVAL '24 hours'
     AND is_external(destination_ip) = true
   GROUP BY source_ip, destination_ip
   HAVING total_bytes > 1000000000  -- 1GB
   ORDER BY total_bytes DESC
   ```

2. **Check for DNS Tunneling**
   ```python
   # Detect DNS tunneling
   dns_queries = get_dns_queries(hours=24)

   for host in unique_hosts(dns_queries):
       query_volume = count_queries(host)
       avg_length = average_query_length(host)
       entropy = calculate_entropy(queries)

       if query_volume > 1000 and avg_length > 50:
           alert_dns_tunnel(host)
   ```

3. **Identify Cloud Storage Uploads**
   ```sql
   SELECT user, destination_domain, SUM(bytes_uploaded)
   FROM proxy_logs
   WHERE destination_domain IN (
     'dropbox.com', 'drive.google.com', 'onedrive.com',
     'mega.nz', 'wetransfer.com'
   )
   AND bytes_uploaded > 100000000  -- 100MB
   GROUP BY user, destination_domain
   ```

4. **Detect Steganography**
   ```python
   # Look for image uploads to unusual locations
   uploads = get_file_uploads(hours=24)

   for upload in uploads:
       if is_image(upload.filename):
           size = get_file_size(upload)
           if size > expected_size(upload.type) * 1.5:
               alert_potential_stego(upload)
   ```

5. **Timeline Reconstruction**
   - Map user activities before/during exfiltration
   - Identify accessed sensitive data
   - Determine exfiltration method and destination

---

## Incident Response Playbooks

### PLAYBOOK-IR-001: Ransomware Incident Response

**Severity:** Critical

**Objective:** Contain and recover from ransomware attack

**Steps:**

1. **IMMEDIATE (0-1 hour)**

   **Containment:**
   - Isolate affected systems from network
   - Disable remote access (VPN, RDP)
   - Block C2 domains/IPs at firewall
   - Preserve forensic evidence

   ```bash
   # Emergency isolation
   iptables -P INPUT DROP
   iptables -P OUTPUT DROP
   iptables -P FORWARD DROP
   ```

2. **INITIAL ASSESSMENT (1-4 hours)**

   **Identification:**
   - Identify ransomware family
   - Determine patient zero
   - Assess encryption spread
   - Check for data exfiltration

   **Evidence Collection:**
   - Memory dumps from infected systems
   - Disk images
   - Network traffic captures
   - Ransomware notes and files

3. **CONTAINMENT (4-12 hours)**

   **IOC Hunt:**
   ```typescript
   // Sweep for ransomware IOCs
   const sweepResults = await huntingService.sweepIOCs({
     iocs: ransomware_iocs,
     scope: 'all',
     lookback_hours: 72
   });
   ```

   **Prevent Spread:**
   - Disable vulnerable services (SMB, RDP)
   - Reset credentials
   - Apply emergency patches
   - Monitor for lateral movement

4. **ERADICATION (12-24 hours)**

   - Remove ransomware from all systems
   - Rebuild compromised systems from known-good backups
   - Verify backup integrity
   - Scan restored systems

5. **RECOVERY (24+ hours)**

   - Restore systems in priority order
   - Validate decryption if available
   - Test critical business functions
   - Gradually restore network connectivity

6. **POST-INCIDENT**

   - Root cause analysis
   - Update defenses
   - Threat intelligence sharing
   - Lessons learned documentation

**Decision Tree:**
```
Do NOT pay ransom → Check backup availability
  ↓
Backups available? → Restore from backup
  ↓
Backups unavailable? → Assess decryption options
  ↓
Decryption available? → Use decryption tools
  ↓
No decryption? → Data loss assessment
```

---

### PLAYBOOK-IR-002: Data Breach Response

**Severity:** High

**Objective:** Respond to confirmed or suspected data breach

**Steps:**

1. **VERIFICATION (0-2 hours)**
   - Confirm breach occurred
   - Identify compromised data
   - Determine breach scope
   - Establish incident timeline

2. **CONTAINMENT (2-6 hours)**
   - Revoke compromised credentials
   - Patch vulnerability (if applicable)
   - Block attacker access
   - Preserve evidence

3. **ASSESSMENT (6-24 hours)**

   **Data Classification:**
   - PII/PHI affected?
   - Financial data exposed?
   - Intellectual property?
   - Customer data?

   **Impact Analysis:**
   - Number of records
   - Affected individuals
   - Regulatory requirements
   - Business impact

4. **NOTIFICATION (24-72 hours)**

   **Legal Requirements:**
   - GDPR: 72 hours
   - HIPAA: 60 days
   - State laws: varies
   - Contractual obligations

   **Stakeholders:**
   - Affected individuals
   - Regulators
   - Law enforcement
   - Partners/customers
   - Media (if required)

5. **REMEDIATION**
   - Implement security improvements
   - Offer credit monitoring (if applicable)
   - Update policies and procedures
   - Enhanced monitoring

---

## Malware Analysis Playbooks

### PLAYBOOK-MAL-001: Unknown File Analysis

**Objective:** Analyze suspicious file for malicious behavior

**Prerequisites:**
- Isolated analysis environment
- Sandbox access
- Static analysis tools

**Steps:**

1. **Initial Triage**
   ```bash
   # Basic file information
   file suspicious.exe
   md5sum suspicious.exe
   sha256sum suspicious.exe

   # Check VirusTotal
   vt-cli file suspicious.exe
   ```

2. **Static Analysis**
   ```python
   # Extract strings
   strings -n 10 suspicious.exe > strings.txt

   # PE analysis
   pefile suspicious.exe

   # Check for packing
   detect_packer(suspicious.exe)
   ```

3. **Sandbox Analysis**
   ```typescript
   // Submit to sandbox
   const analysis = await malwareAnalyzer.performDynamicAnalysis(
     'sample-id',
     'CUCKOO'
   );
   ```

4. **Behavioral Analysis**
   - Monitor process creation
   - Track file modifications
   - Observe registry changes
   - Capture network activity
   - Check for persistence mechanisms

5. **IOC Extraction**
   ```typescript
   // Extract IOCs from analysis
   const iocs = extractIOCs(analysis);

   // Add to IOC database
   for (const ioc of iocs) {
     await iocManager.addIOC(ioc);
   }
   ```

6. **Classification**
   - Determine malware family
   - Map to MITRE ATT&CK
   - Identify C2 infrastructure
   - Document capabilities

7. **Intelligence Sharing**
   - Create STIX bundle
   - Share with ISACs
   - Update threat feeds
   - Generate YARA rules

---

## Vulnerability Management Playbooks

### PLAYBOOK-VM-001: Critical Vulnerability Response

**Trigger:** New critical vulnerability disclosed

**Objective:** Assess and remediate critical vulnerability

**Steps:**

1. **ASSESSMENT (0-4 hours)**

   **Information Gathering:**
   - CVE details and CVSS score
   - Affected products/versions
   - Exploit availability
   - Proof of concept code

   ```typescript
   // Check vulnerability database
   const vuln = await vulnManager.trackVulnerability({
     cveId: 'CVE-2024-XXXX',
     severity: 'CRITICAL',
     cvssV3: { baseScore: 10.0, ... },
     exploitAvailable: 'PUBLIC',
     ...
   });
   ```

2. **ASSET IDENTIFICATION (4-8 hours)**

   ```sql
   -- Find affected assets
   SELECT asset_id, asset_name, version
   FROM assets
   WHERE product = 'affected_product'
     AND version IN ('vulnerable_versions')
   ```

3. **RISK PRIORITIZATION (8-12 hours)**

   ```typescript
   // Calculate risk for each asset
   for (const asset of affectedAssets) {
     const risk = calculateRisk({
       cvss: vuln.cvssV3.baseScore,
       exploitAvailable: vuln.exploitAvailable,
       internetFacing: asset.internetFacing,
       dataClassification: asset.dataClassification,
       businessCriticality: asset.criticality
     });

     asset.riskScore = risk;
   }

   // Sort by risk score
   const prioritized = affectedAssets.sort((a, b) =>
     b.riskScore - a.riskScore
   );
   ```

4. **REMEDIATION (12-72 hours)**

   **Patch Management:**
   - Test patches in dev/staging
   - Create rollback plan
   - Schedule maintenance windows
   - Deploy patches by priority

   **Compensating Controls (if patch unavailable):**
   - Network segmentation
   - IPS signatures
   - WAF rules
   - Access restrictions

5. **VERIFICATION**
   - Confirm patch deployment
   - Validate remediation
   - Remove compensating controls (if applicable)
   - Update asset inventory

6. **DOCUMENTATION**
   - Record remediation actions
   - Update risk register
   - Generate compliance reports
   - Share lessons learned

---

## Integration Examples

### SOAR Integration

```python
# Automated playbook execution in SOAR
from soar import Playbook, Action

playbook = Playbook("Ransomware Response")

# Step 1: Isolate
playbook.add_action(Action("Isolate Host",
    execute=lambda host: firewall.block(host)))

# Step 2: Collect IOCs
playbook.add_action(Action("Extract IOCs",
    execute=lambda host: extract_iocs(host)))

# Step 3: Hunt
playbook.add_action(Action("IOC Sweep",
    execute=lambda iocs: hunt_iocs(iocs)))

# Step 4: Contain
playbook.add_action(Action("Block IOCs",
    execute=lambda iocs: block_iocs(iocs)))

playbook.execute(trigger_event)
```

### SIEM Correlation

```sql
-- Alert rule for lateral movement
CREATE ALERT lateral_movement
WHEN (
  SELECT COUNT(DISTINCT destination_host)
  FROM authentication_logs
  WHERE logon_type = 3
    AND time > NOW() - 10 MINUTES
  GROUP BY source_user
) > 5
THEN notify_soc('Potential lateral movement detected')
```

---

## Metrics and KPIs

### Threat Intelligence

- Feed reliability score
- IOC hit rate
- False positive rate
- Time to enrich IOCs
- Intelligence coverage (% of threats detected)

### Threat Hunting

- Hunts per week
- Findings per hunt
- Time to detect (TTD)
- Hunt efficiency (findings/time)
- Coverage of MITRE ATT&CK techniques

### Incident Response

- Mean time to detect (MTTD)
- Mean time to respond (MTTR)
- Mean time to contain (MTTC)
- Mean time to recover (MTTR)
- Incident escalation rate

---

## Continuous Improvement

1. **Playbook Review**
   - Quarterly playbook updates
   - Incorporate lessons learned
   - Add new threat scenarios
   - Remove obsolete procedures

2. **Tabletop Exercises**
   - Monthly scenario-based exercises
   - Test playbook effectiveness
   - Train team members
   - Identify gaps

3. **Automation Opportunities**
   - Identify repetitive tasks
   - Develop automation scripts
   - Integrate with SOAR
   - Measure efficiency gains

---

## Additional Resources

- MITRE ATT&CK Framework: https://attack.mitre.org/
- NIST Cybersecurity Framework: https://www.nist.gov/cyberframework
- SANS Incident Response: https://www.sans.org/incident-response
- Threat Hunting Project: https://www.threathunting.net/

---

*Document Version: 1.0*
*Last Updated: 2024*
*Next Review: Quarterly*
