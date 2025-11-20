# Counterintelligence Operations Manual

## Overview

This manual provides operational procedures and guidelines for conducting counterintelligence operations using the IntelGraph Counterintelligence Platform.

## Table of Contents

1. [Operational Security (OPSEC)](#operational-security)
2. [Insider Threat Operations](#insider-threat-operations)
3. [Counterespionage Operations](#counterespionage-operations)
4. [Technical Security Operations](#technical-security-operations)
5. [Personnel Security Operations](#personnel-security-operations)
6. [Coordination and Reporting](#coordination-and-reporting)
7. [Emergency Procedures](#emergency-procedures)

## Operational Security (OPSEC)

### OPSEC Principles

1. **Critical Information Identification**
   - Classify all operational data appropriately
   - Identify information that adversaries seek
   - Protect sources and methods

2. **Threat Analysis**
   - Identify adversary capabilities
   - Assess adversary intentions
   - Evaluate collection methods

3. **Vulnerability Assessment**
   - Identify gaps in security
   - Assess exposure risks
   - Evaluate countermeasure effectiveness

4. **Risk Assessment**
   - Calculate threat-vulnerability pairings
   - Determine probability of compromise
   - Estimate impact of disclosure

5. **Countermeasure Application**
   - Implement protective measures
   - Apply defensive techniques
   - Monitor effectiveness

### OPSEC Procedures

#### Secure Communications

```
CLASSIFICATION: SECRET
PROCEDURE: COMSEC-001

1. Use only approved encrypted communication channels
2. Verify recipient identity before transmission
3. Use proper authentication codes
4. Minimize sensitive information in communications
5. Use code words for sensitive operations
6. Destroy communications after reading when appropriate
```

#### Information Handling

```
CLASSIFICATION: SECRET
PROCEDURE: INFOSEC-001

1. Mark all documents with appropriate classification
2. Store classified materials in approved containers
3. Limit access to need-to-know personnel
4. Track all classified document movements
5. Conduct regular inventory of classified materials
6. Destroy classified materials per approved procedures
```

## Insider Threat Operations

### Detection Phase

#### Initial Alert Processing

1. **Alert Receipt**
   - Review alert details from detection system
   - Verify alert authenticity
   - Classify alert severity
   - Document receipt time

2. **Preliminary Assessment**
   - Gather additional context
   - Review user's baseline behavior
   - Check for false positive indicators
   - Determine if escalation is warranted

3. **Decision Point**
   - DISMISS: Document reasoning, maintain record
   - MONITOR: Increase surveillance level
   - INVESTIGATE: Initiate formal investigation

#### Enhanced Monitoring

```typescript
// Example: Escalate monitoring for high-risk user
const monitor = new PrivilegedAccessMonitor();

// Set enhanced monitoring parameters
monitor.setMonitoringLevel(userId, 'INTENSIVE');

// Configure alerts for all access events
monitor.configureAlerts(userId, {
  allAccess: true,
  realtime: true,
  requireApproval: true
});
```

### Investigation Phase

#### Investigation Initiation

1. **Case Opening**
   ```
   CLASSIFICATION: SECRET

   Case Number: IT-[YEAR]-[SEQUENCE]
   Subject: [NAME]
   Opened: [DATE]
   Investigator: [NAME]
   Basis: [ALERT/REPORT/TIP]
   ```

2. **Investigation Plan**
   - Define objectives
   - Identify information requirements
   - Determine investigative methods
   - Establish timeline
   - Assign resources

3. **Legal Authorization**
   - Obtain necessary approvals
   - Document authorization scope
   - Establish monitoring parameters
   - Define reporting requirements

#### Evidence Collection

```typescript
// Example: Document evidence
const caseManager = new CounterspyCaseManager();

caseManager.addEvidence(caseId, {
  type: 'DIGITAL_FORENSICS',
  description: 'USB device insertion detected',
  collectedBy: investigatorId,
  location: 'Workstation 42',
  timestamp: new Date()
});
```

### Mitigation Phase

#### Immediate Actions

1. **Access Restriction**
   - Suspend user accounts if necessary
   - Revoke privileged access
   - Disable VPN access
   - Block physical access

2. **Data Protection**
   - Prevent further data exfiltration
   - Secure compromised systems
   - Preserve evidence
   - Document all actions

3. **Notification**
   - Inform leadership
   - Notify legal counsel
   - Alert security team
   - Coordinate with HR

## Counterespionage Operations

### Foreign Intelligence Detection

#### Surveillance Detection Route (SDR)

```
CLASSIFICATION: SECRET
PROCEDURE: SDR-001

PURPOSE: Detect hostile surveillance of personnel or facilities

EXECUTION:
1. Pre-operational planning
   - Identify high-risk personnel
   - Plan surveillance detection routes
   - Prepare cover story
   - Brief team members

2. Route execution
   - Follow planned route with variations
   - Use chokepoints to identify followers
   - Employ counter-surveillance techniques
   - Document all observations

3. Post-operation analysis
   - Review collected intelligence
   - Identify surveillance patterns
   - Update threat assessment
   - Report findings
```

#### Elicitation Response

When elicitation is suspected:

1. **Recognition**
   - Identify elicitation techniques
   - Note specific questions asked
   - Observe elicitor behavior
   - Document interaction

2. **Response**
   - Provide only public information
   - Deflect sensitive inquiries
   - Ask clarifying questions
   - Control conversation direction

3. **Reporting**
   - File immediate report
   - Include all details
   - Describe elicitor
   - Recommend follow-up actions

### Double Agent Operations

#### Handler Responsibilities

```
CLASSIFICATION: TOP SECRET
PROCEDURE: DA-001

1. OPERATIONAL SECURITY
   - Maintain compartmentation
   - Use secure meeting locations
   - Employ counter-surveillance
   - Protect agent identity

2. AGENT MANAGEMENT
   - Conduct regular meetings
   - Assess agent reliability
   - Monitor agent stress levels
   - Provide necessary support

3. INFORMATION CONTROL
   - Feed approved information only
   - Track all information provided
   - Monitor adversary response
   - Adjust information feed as needed

4. RISK MANAGEMENT
   - Continuously assess operational risks
   - Monitor for compromise indicators
   - Maintain exfiltration plan
   - Prepare termination procedures
```

#### Information Feed Protocol

```typescript
// Example: Feed controlled information
const agentHandler = new DoubleAgentHandler();

agentHandler.feedInformation(agentId, {
  type: 'TECHNICAL_DOCUMENT',
  deceptionLevel: 'PARTIAL', // Mix of true and false
  objective: 'Misdirect adversary R&D efforts',
  approvedBy: 'Chief of Operations',
  classification: 'SECRET'
});

// Monitor adversary response
const assessment = agentHandler.assessAgentRisk(agentId);
```

## Technical Security Operations

### TSCM Operations

#### Sweep Procedures

```
CLASSIFICATION: SECRET
PROCEDURE: TSCM-001

PRE-SWEEP ACTIVITIES:
1. Facility lockdown
2. Personnel cleared from area
3. Equipment setup and calibration
4. Baseline measurements recorded
5. Security perimeter established

SWEEP EXECUTION:
1. Physical inspection
   - Visual examination of all surfaces
   - Check for signs of tampering
   - Inspect electrical fixtures
   - Examine furniture and decorations

2. RF spectrum analysis
   - Scan entire frequency range
   - Identify all signals
   - Compare against baseline
   - Investigate anomalies

3. Non-linear junction detection
   - Sweep all surfaces
   - Identify electronic components
   - Investigate unexpected findings
   - Document all detections

4. Thermal imaging
   - Scan walls and ceilings
   - Identify heat signatures
   - Investigate anomalies
   - Document findings

POST-SWEEP ACTIVITIES:
1. Analyze all findings
2. Neutralize threats if discovered
3. Prepare detailed report
4. Provide recommendations
5. Schedule next sweep
```

#### Finding Response

```typescript
// Example: Document TSCM finding
const tscmManager = new TSCMOperationsManager();

tscmManager.recordFinding(sweepId, {
  type: 'RF_TRANSMITTER',
  location: 'Behind picture frame',
  frequency: 2437.0, // MHz
  description: 'Small RF transmitter detected',
  threatLevel: 'CRITICAL'
});

// Immediate actions
// 1. Secure the device without touching
// 2. Photograph in place
// 3. Clear the room
// 4. Call forensics team
// 5. Initiate investigation
```

### Supply Chain Security

#### Component Assessment

```
CLASSIFICATION: CONFIDENTIAL
PROCEDURE: SCS-001

1. VENDOR ASSESSMENT
   - Review vendor background
   - Check country of origin
   - Assess manufacturing locations
   - Review past performance
   - Check for red flags

2. COMPONENT INSPECTION
   - Visual inspection
   - X-ray examination
   - Firmware analysis
   - Hardware testing
   - Documentation review

3. RISK DETERMINATION
   - Calculate risk score
   - Determine trust level
   - Identify vulnerabilities
   - Recommend mitigation
   - Approve or reject

4. ONGOING MONITORING
   - Track component performance
   - Monitor for anomalies
   - Review security updates
   - Reassess periodically
```

## Personnel Security Operations

### Clearance Adjudication

#### Investigation Process

```
CLASSIFICATION: CONFIDENTIAL
PROCEDURE: ADJ-001

PHASE 1: INITIATION
1. Receive clearance request
2. Verify position requirements
3. Initiate background investigation
4. Assign investigator

PHASE 2: INVESTIGATION
1. Employment verification
2. Education verification
3. Criminal records check
4. Financial records review
5. Foreign contact investigation
6. Reference interviews
7. Psychological evaluation (if required)

PHASE 3: ADJUDICATION
1. Review all findings
2. Apply adjudicative guidelines
3. Assess whole-person concept
4. Make recommendation:
   - APPROVE: Grant clearance
   - CONDITIONAL: Grant with restrictions
   - DENY: Deny clearance
   - FURTHER INVESTIGATION: Require additional information

PHASE 4: NOTIFICATION
1. Notify applicant of decision
2. Document decision reasoning
3. Provide appeal information (if denied)
4. Issue clearance (if approved)
```

#### Continuous Evaluation

```typescript
// Example: Monitor cleared personnel
const continuousEval = {
  subjectId: userId,
  enrolledDate: new Date(),
  status: 'ACTIVE',
  monitoredSources: [
    'CRIMINAL_RECORDS',
    'FINANCIAL_RECORDS',
    'FOREIGN_TRAVEL',
    'FOREIGN_CONTACTS',
    'INSIDER_THREAT',
    'SECURITY_VIOLATIONS'
  ],
  alerts: []
};

// Automated monitoring will generate alerts for:
// - Criminal activity
// - Financial distress
// - Unreported foreign contacts
// - Unusual foreign travel
// - Security violations
// - Behavioral changes
```

### Foreign Contact Management

#### Reporting Requirements

```
CLASSIFICATION: CONFIDENTIAL

ALL CLEARED PERSONNEL MUST REPORT:

1. CLOSE AND CONTINUING CONTACT with foreign nationals
   - Family members
   - Cohabitants
   - Close friends
   - Regular associates

2. FOREIGN TRAVEL
   - Pre-travel: 30 days before departure
   - Post-travel: Within 5 days of return

3. FOREIGN BUSINESS INTERESTS
   - Foreign investments
   - Foreign property
   - Foreign business relationships

4. SUSPICIOUS APPROACHES
   - Elicitation attempts
   - Recruitment approaches
   - Unusual interest in work
   - Requests for sensitive information
```

## Coordination and Reporting

### Inter-Agency Coordination

#### Information Sharing

```
CLASSIFICATION: SECRET
PROCEDURE: COORD-001

SHARING PROTOCOLS:
1. Verify recipient clearance
2. Determine need-to-know
3. Apply appropriate classification
4. Use secure transmission methods
5. Document all sharing
6. Track information usage

COORDINATION MEETINGS:
1. Weekly threat briefings
2. Monthly operations reviews
3. Quarterly strategic planning
4. Annual assessments
5. Ad-hoc emergency coordination
```

### Reporting Requirements

#### Incident Reporting

```
CLASSIFICATION: SECRET

IMMEDIATE REPORTING (Within 1 hour):
- Active espionage detected
- Critical insider threat
- Surveillance of sensitive operations
- Compromise of classified information
- Security breach

PRIORITY REPORTING (Within 24 hours):
- High-level threats
- Significant security violations
- Foreign influence operations
- Technical security issues

ROUTINE REPORTING (Within 5 days):
- Foreign contact reports
- Travel debriefs
- Routine security violations
- TSCM sweep results
- Background investigation results
```

## Emergency Procedures

### Security Incident Response

```
CLASSIFICATION: SECRET
PROCEDURE: SIR-001

PHASE 1: DETECTION AND REPORTING (0-5 minutes)
1. Identify security incident
2. Report to security operations center
3. Provide initial assessment
4. Request additional resources if needed

PHASE 2: CONTAINMENT (5-30 minutes)
1. Isolate affected systems/areas
2. Prevent further compromise
3. Preserve evidence
4. Establish security perimeter

PHASE 3: ASSESSMENT (30 minutes - 2 hours)
1. Determine scope of compromise
2. Identify affected assets
3. Assess damage
4. Determine response requirements

PHASE 4: RESPONSE (Ongoing)
1. Execute remediation plan
2. Restore normal operations
3. Monitor for additional activity
4. Update threat assessment

PHASE 5: RECOVERY (Days-Weeks)
1. Complete investigation
2. Implement corrective measures
3. Update security procedures
4. Conduct lessons learned
5. Prepare final report
```

### Emergency Contacts

```
CLASSIFICATION: UNCLASSIFIED

24/7 SECURITY OPERATIONS CENTER:
Phone: [REDACTED]
Secure Phone: [REDACTED]
Email: [REDACTED]

COUNTERINTELLIGENCE DUTY OFFICER:
Phone: [REDACTED]
Secure Phone: [REDACTED]

TECHNICAL SECURITY:
Phone: [REDACTED]

PERSONNEL SECURITY:
Phone: [REDACTED]

FBI FIELD OFFICE:
Phone: [REDACTED]
```

## Appendices

### Appendix A: Threat Indicators

#### Insider Threat Indicators

- Unusual work hours
- Excessive copying/downloading
- Interest in matters outside job scope
- Disgruntlement with organization
- Financial difficulties
- Unreported foreign contacts
- Attempts to bypass security
- Removal of sensitive materials

#### Espionage Indicators

- Suspicious inquiries about sensitive programs
- Attempts to obtain unauthorized access
- Unexplained affluence
- Foreign travel to sensitive countries
- Contact with foreign intelligence personnel
- Elicitation attempts
- Technical surveillance detected

#### Foreign Influence Indicators

- Coordinated messaging campaigns
- Inauthentic social media activity
- Front organization activity
- Covert funding sources
- Disinformation narratives
- Agent of influence activity

### Appendix B: Classification Guidelines

```
TOP SECRET: Exceptionally grave damage to national security
SECRET: Serious damage to national security
CONFIDENTIAL: Damage to national security
UNCLASSIFIED: No damage to national security
```

### Appendix C: Legal Authorities

- Executive Order 12333 (Intelligence Activities)
- National Security Act of 1947
- Foreign Intelligence Surveillance Act (FISA)
- Counterintelligence Enhancement Act
- [Additional relevant authorities]

---

**CLASSIFICATION: SECRET**

**DISTRIBUTION: Restricted to authorized counterintelligence personnel**

**REVIEW DATE: Annually or as required**

**LAST UPDATED: 2025-11-20**
